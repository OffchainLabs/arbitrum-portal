import { getStepTransaction } from '@lifi/sdk';
import type { LiFiStep, ProcessType, RouteExtended } from '@lifi/sdk';
import { constants } from 'ethers';

import type { LifiCrosschainTransfersRoute } from '../app/api/crosschain-transfers/lifi';
import { addressesEqual } from '../util/AddressUtils';
import { getNetworksRelationship } from '../util/getNetworksRelationship';
import type { SolanaWalletHandle } from '../wallet/types';
import type { QuotedGasEstimates } from './BridgeTransferStarter';
import type { LifiRouteExecutionProps } from './LifiRouteExecutor';

type SolanaRouteCallbacks = Pick<
  LifiRouteExecutionProps,
  'onRouteUpdate' | 'onRouteExecutionError'
> & {
  onRouteExecutionComplete?: (route: RouteExtended) => void;
};

export type SolanaTransferStarterProps = {
  lifiRoute: LifiCrosschainTransfersRoute;
  wallet?: Pick<SolanaWalletHandle, 'sendTransaction' | 'confirmTransaction'>;
  prepareStep?: typeof getStepTransaction;
  confirmTransaction?: SolanaWalletHandle['confirmTransaction'];
};

type SolanaTransferResult = {
  transferType: 'lifi';
  status: 'pending';
  sourceChainTransaction: { hash: string };
  lifiRoute: RouteExtended;
};

function decodeTransaction(data: string | undefined): Uint8Array {
  if (!data) {
    throw new Error('LiFi did not return a Solana transaction payload.');
  }

  try {
    const decoded = atob(data);
    if (!decoded.length) throw new Error('The transaction payload is empty.');
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  } catch (error) {
    throw new Error('LiFi returned an invalid Solana transaction payload.', { cause: error });
  }
}

function optionalAddressesEqual(left: string | undefined, right: string | undefined): boolean {
  return left === right || addressesEqual(left, right);
}

function assertPreparedStepMatchesQuote(quoted: LiFiStep, prepared: LiFiStep): void {
  const original = quoted.action;
  const refreshed = prepared.action;
  if (
    prepared.id !== quoted.id ||
    prepared.tool !== quoted.tool ||
    refreshed.fromChainId !== original.fromChainId ||
    refreshed.toChainId !== original.toChainId ||
    refreshed.fromAmount !== original.fromAmount ||
    refreshed.slippage !== original.slippage ||
    refreshed.fromToken.chainId !== original.fromToken.chainId ||
    refreshed.toToken.chainId !== original.toToken.chainId ||
    !addressesEqual(refreshed.fromToken.address, original.fromToken.address) ||
    !addressesEqual(refreshed.toToken.address, original.toToken.address) ||
    !optionalAddressesEqual(refreshed.fromAddress, original.fromAddress) ||
    !optionalAddressesEqual(refreshed.toAddress, original.toAddress)
  ) {
    throw new Error('LiFi changed the transfer details. Request a new quote before signing.');
  }
}

function routeWithProcess({
  route,
  step,
  signature,
}: {
  route: LifiCrosschainTransfersRoute['protocolData']['route'];
  step: LiFiStep;
  signature: string;
}): RouteExtended {
  const timestamp = Date.now();
  const processType: ProcessType =
    step.action.fromChainId === step.action.toChainId ? 'SWAP' : 'CROSS_CHAIN';
  const process = {
    type: processType,
    status: 'PENDING' as const,
    chainId: step.action.fromChainId,
    startedAt: timestamp,
    txHash: signature,
    pendingAt: timestamp,
  };

  return {
    ...route,
    steps: [
      {
        ...step,
        execution: {
          startedAt: timestamp,
          status: 'PENDING',
          process: [process],
        },
      },
    ],
  };
}

export class SolanaTransferStarter {
  private readonly lifiRoute: LifiCrosschainTransfersRoute;
  private readonly wallet: Pick<SolanaWalletHandle, 'sendTransaction' | 'confirmTransaction'>;
  private readonly prepareStep: typeof getStepTransaction;
  private readonly confirmTransaction?: SolanaWalletHandle['confirmTransaction'];

  constructor({
    lifiRoute,
    wallet = {},
    prepareStep = getStepTransaction,
    confirmTransaction,
  }: SolanaTransferStarterProps) {
    this.lifiRoute = lifiRoute;
    this.wallet = wallet;
    this.prepareStep = prepareStep;
    this.confirmTransaction = confirmTransaction ?? wallet.confirmTransaction;
  }

  public async transferEstimateGas(): Promise<QuotedGasEstimates> {
    const { parentChainId, childChainId } = getNetworksRelationship({
      sourceChainId: this.lifiRoute.fromChainId,
      destinationChainId: this.lifiRoute.toChainId,
    });
    return this.lifiRoute.gas.reduce<QuotedGasEstimates>(
      (result, gas) => {
        if (gas.chainId === parentChainId) {
          result.estimatedParentChainGas = result.estimatedParentChainGas.add(gas.estimate ?? 0);
          result.estimatedParentChainGasFee = result.estimatedParentChainGasFee.add(gas.amount);
        }
        if (gas.chainId === childChainId) {
          result.estimatedChildChainGas = result.estimatedChildChainGas.add(gas.estimate ?? 0);
          result.estimatedChildChainGasFee = result.estimatedChildChainGasFee.add(gas.amount);
        }
        return result;
      },
      {
        estimatedParentChainGas: constants.Zero,
        estimatedChildChainGas: constants.Zero,
        estimatedParentChainGasFee: constants.Zero,
        estimatedChildChainGasFee: constants.Zero,
      },
    );
  }

  public async transfer(callbacks: SolanaRouteCallbacks): Promise<SolanaTransferResult> {
    const [step] = this.lifiRoute.protocolData.route.steps;
    if (!step || this.lifiRoute.protocolData.route.steps.length !== 1) {
      throw new Error('Solana execution currently supports single-step LiFi routes only.');
    }
    if (!this.wallet.sendTransaction) {
      throw new Error('The connected Solana wallet cannot send transactions.');
    }
    if (!this.confirmTransaction) {
      throw new Error('The connected Solana wallet cannot confirm transactions.');
    }

    const minimumOutput = BigInt(step.estimate.toAmountMin);
    const slippageScale = 1_000_000_000n;
    const slippage = BigInt(Math.floor((step.action.slippage ?? 0.005) * Number(slippageScale)));
    const preparedStep = await this.prepareStep(structuredClone(step));
    assertPreparedStepMatchesQuote(step, preparedStep);
    const outputReduction = minimumOutput - BigInt(preparedStep.estimate.toAmountMin);
    if (outputReduction * slippageScale > minimumOutput * slippage) {
      throw new Error('LiFi quote changed beyond your slippage tolerance. Request a new quote.');
    }
    const serializedTransaction = decodeTransaction(preparedStep.transactionRequest?.data);
    const signature = await this.wallet.sendTransaction(serializedTransaction);
    const pendingRoute = routeWithProcess({
      route: this.lifiRoute.protocolData.route,
      step: preparedStep,
      signature,
    });
    callbacks.onRouteUpdate?.(pendingRoute);

    void this.confirmTransaction(signature, serializedTransaction)
      .then(() => callbacks.onRouteExecutionComplete?.(pendingRoute))
      .catch((error: unknown) => {
        callbacks.onRouteExecutionError(error, pendingRoute);
      });

    return {
      transferType: 'lifi',
      status: 'pending',
      sourceChainTransaction: { hash: signature },
      lifiRoute: pendingRoute,
    };
  }
}
