import { getStepTransaction } from '@lifi/sdk';
import type { LiFiStep, ProcessType, RouteExtended } from '@lifi/sdk';

import type { LifiCrosschainTransfersRoute } from '../app/api/crosschain-transfers/lifi';
import type { SolanaWalletHandle } from '../wallet/types';
import type { LifiRouteExecutionProps } from './LifiRouteExecutor';

type SolanaRouteCallbacks = Pick<
  LifiRouteExecutionProps,
  'onRouteUpdate' | 'onRouteExecutionError' | 'onRouteExecutionComplete'
>;

export type SolanaTransferStarterProps = {
  lifiRoute: LifiCrosschainTransfersRoute;
  wallet: Pick<SolanaWalletHandle, 'sendTransaction' | 'confirmTransaction'>;
  prepareStep?: typeof getStepTransaction;
  confirmTransaction?: (signature: string) => Promise<void>;
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
  private readonly confirmTransaction?: (signature: string) => Promise<void>;

  constructor({
    lifiRoute,
    wallet,
    prepareStep = getStepTransaction,
    confirmTransaction,
  }: SolanaTransferStarterProps) {
    this.lifiRoute = lifiRoute;
    this.wallet = wallet;
    this.prepareStep = prepareStep;
    this.confirmTransaction = confirmTransaction ?? wallet.confirmTransaction;
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

    const preparedStep = await this.prepareStep(step);
    const serializedTransaction = decodeTransaction(preparedStep.transactionRequest?.data);
    const signature = await this.wallet.sendTransaction(serializedTransaction);
    const pendingRoute = routeWithProcess({
      route: this.lifiRoute.protocolData.route,
      step: preparedStep,
      signature,
    });
    callbacks.onRouteUpdate?.(pendingRoute);

    void this.confirmTransaction(signature)
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
