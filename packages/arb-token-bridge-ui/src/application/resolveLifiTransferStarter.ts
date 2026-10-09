import type { LifiCrosschainTransfersRoute } from '../app/api/crosschain-transfers/lifi';
import { isLifiTransfer } from '../app/api/crosschain-transfers/utils';
import type { LifiRouteExecutionProps } from '../token-bridge-sdk/LifiRouteExecutor';
import { LifiTransferStarter } from '../token-bridge-sdk/LifiTransferStarter';
import { SolanaTransferStarter } from '../token-bridge-sdk/SolanaTransferStarter';
import type { Address } from '../util/AddressUtils';
import { addressesEqual } from '../util/AddressUtils';
import { getNativeTokenAddress } from '../wallet/constants';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import { getEvmExecutionRuntime } from './evmExecutionRuntime';
import type { TransferCallbacks, TransferSubmission, TransferWallet } from './executeTransfer';

type RouteCallbacks = Pick<
  LifiRouteExecutionProps,
  'onRouteUpdate' | 'onRouteExecutionError' | 'onRouteExecutionComplete'
>;

export type LifiTransferStarterResolution = {
  transfer: (callbacks: RouteCallbacks) => Promise<{
    waitForSourceConfirmation?: () => Promise<unknown>;
  }>;
};

export async function resolveLifiTransferStarter({
  route,
  wallet,
  sourceChainId,
  destinationChainId,
  sourceTokenAddress,
  destinationTokenAddress,
  amountBigNumber,
  destinationAddress,
  confirmDialog,
}: {
  route: LifiCrosschainTransfersRoute;
  wallet: TransferWallet;
  amountBigNumber: TransferSubmission['amountBigNumber'];
  destinationAddress: Address;
  confirmDialog: TransferCallbacks['confirmDialog'];
  sourceChainId: number;
  destinationChainId: number;
  sourceTokenAddress: string;
  destinationTokenAddress: string;
}): Promise<LifiTransferStarterResolution> {
  const { fromChainId, toChainId } = route;
  if (!isLifiTransfer({ sourceChainId: fromChainId, destinationChainId: toChainId })) {
    throw new Error('LiFi execution is unavailable for this chain pair.');
  }
  if (!wallet.isConnected || !wallet.account.address) {
    throw new Error('The source wallet is not connected.');
  }
  if (
    !addressesEqual(route.fromAddress, wallet.account.address) ||
    (route.protocolData.route.fromAddress !== undefined &&
      !addressesEqual(route.protocolData.route.fromAddress, wallet.account.address))
  ) {
    throw new Error('The connected wallet does not match the account that requested this route.');
  }

  const sourceEcosystem = getWalletEcosystem(fromChainId);
  const protocolRoute = route.protocolData.route;
  const firstStep = protocolRoute.steps[0];
  const lastStep = protocolRoute.steps.at(-1);
  if (
    !firstStep ||
    !lastStep ||
    fromChainId !== sourceChainId ||
    toChainId !== destinationChainId ||
    protocolRoute.fromChainId !== sourceChainId ||
    protocolRoute.toChainId !== destinationChainId ||
    protocolRoute.fromToken.chainId !== sourceChainId ||
    protocolRoute.toToken.chainId !== destinationChainId ||
    firstStep.action.fromChainId !== sourceChainId ||
    lastStep.action.toChainId !== destinationChainId ||
    firstStep.action.fromToken.chainId !== sourceChainId ||
    lastStep.action.toToken.chainId !== destinationChainId ||
    !amountBigNumber.eq(route.fromAmount.amount) ||
    !amountBigNumber.eq(protocolRoute.fromAmount) ||
    !amountBigNumber.eq(firstStep.action.fromAmount) ||
    route.toAmount.amount !== protocolRoute.toAmount ||
    protocolRoute.toAmount !== lastStep.estimate.toAmount ||
    !addressesEqual(route.fromAmount.token.address, sourceTokenAddress) ||
    !addressesEqual(protocolRoute.fromToken.address, sourceTokenAddress) ||
    !addressesEqual(firstStep.action.fromToken.address, sourceTokenAddress) ||
    !addressesEqual(route.toAmount.token.address, destinationTokenAddress) ||
    !addressesEqual(protocolRoute.toToken.address, destinationTokenAddress) ||
    !addressesEqual(lastStep.action.toToken.address, destinationTokenAddress) ||
    !addressesEqual(firstStep.action.fromAddress, wallet.account.address) ||
    !addressesEqual(route.toAddress, destinationAddress) ||
    (protocolRoute.toAddress !== undefined &&
      !addressesEqual(protocolRoute.toAddress, destinationAddress)) ||
    (lastStep.action.toAddress === undefined
      ? sourceEcosystem !== 'evm' || !addressesEqual(destinationAddress, wallet.account.address)
      : !addressesEqual(lastStep.action.toAddress, destinationAddress))
  ) {
    throw new Error('The LiFi quote does not match this transfer. Request a new quote.');
  }

  if (wallet.ecosystem !== sourceEcosystem) {
    throw new Error('The selected wallet does not match the source chain.');
  }

  switch (sourceEcosystem) {
    case 'evm': {
      const runtime = await getEvmExecutionRuntime({
        sourceChainId: fromChainId,
        destinationChainId: toChainId,
        expectedAccount: wallet.account.address,
      });
      const starter = new LifiTransferStarter({
        sourceChainProvider: runtime.sourceChainProvider,
        destinationChainProvider: runtime.destinationChainProvider,
        sourceChainErc20Address: addressesEqual(
          sourceTokenAddress,
          getNativeTokenAddress(sourceChainId),
        )
          ? undefined
          : sourceTokenAddress,
        destinationChainErc20Address: addressesEqual(
          destinationTokenAddress,
          getNativeTokenAddress(destinationChainId),
        )
          ? undefined
          : destinationTokenAddress,
        lifiRoute: {
          ...route,
          protocolData: {
            route: {
              ...protocolRoute,
              fromAddress: route.fromAddress,
              toAddress: destinationAddress,
            },
          },
        },
      });
      return {
        transfer: async (callbacks) => {
          const transfer = await starter.transfer({
            amount: amountBigNumber,
            destinationAddress,
            wagmiConfig: runtime.wagmiConfig,
            onApprovalRequest: (approvalRequest) =>
              confirmDialog('approve_lifi_token', { lifiApproval: { approvalRequest } }),
            ...callbacks,
          });
          const transaction = transfer.sourceChainTransaction;
          return {
            waitForSourceConfirmation: 'wait' in transaction ? () => transaction.wait() : undefined,
          };
        },
      };
    }
    case 'solana': {
      if (!wallet.sendTransaction || !wallet.confirmTransaction) {
        throw new Error('The connected Solana wallet cannot execute transactions.');
      }
      const starter = new SolanaTransferStarter({ lifiRoute: route, wallet });
      return {
        transfer: async (callbacks) => {
          await starter.transfer(callbacks);
          return {};
        },
      };
    }
  }
}
