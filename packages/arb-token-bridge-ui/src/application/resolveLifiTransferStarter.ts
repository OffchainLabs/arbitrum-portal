import type { LifiCrosschainTransfersRoute } from '../app/api/crosschain-transfers/lifi';
import { isLifiTransfer } from '../app/api/crosschain-transfers/utils';
import type { LifiRouteExecutionProps } from '../token-bridge-sdk/LifiRouteExecutor';
import { LifiTransferStarter } from '../token-bridge-sdk/LifiTransferStarter';
import { addressesEqual } from '../util/AddressUtils';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import { createSolanaTransferStarter } from '../wallet/solana';
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
  sourceChainErc20Address,
  destinationChainErc20Address,
  amountBigNumber,
  destinationAddress,
  confirmDialog,
}: {
  route: LifiCrosschainTransfersRoute;
  wallet: TransferWallet;
  amountBigNumber: TransferSubmission['amountBigNumber'];
  destinationAddress?: string;
  confirmDialog: TransferCallbacks['confirmDialog'];
  sourceChainErc20Address?: string;
  destinationChainErc20Address?: string;
}): Promise<LifiTransferStarterResolution> {
  const { fromChainId, toChainId } = route;
  if (!isLifiTransfer({ sourceChainId: fromChainId, destinationChainId: toChainId })) {
    throw new Error('LiFi execution is unavailable for this chain pair.');
  }
  if (!wallet.isConnected || !wallet.account.address) {
    throw new Error('The source wallet is not connected.');
  }
  if (route.fromAddress && !addressesEqual(route.fromAddress, wallet.account.address)) {
    throw new Error('The connected wallet does not match the account that requested this route.');
  }

  const sourceEcosystem = getWalletEcosystem(fromChainId);
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
        sourceChainErc20Address,
        destinationChainErc20Address,
        lifiRoute: route,
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
      const starter = createSolanaTransferStarter({ lifiRoute: route, wallet });
      return {
        transfer: async (callbacks) => {
          await starter.transfer(callbacks);
          return {};
        },
      };
    }
  }
}
