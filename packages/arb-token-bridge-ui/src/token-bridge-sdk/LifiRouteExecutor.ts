import type { ExecutionOptions, Route, RouteExtended, TransactionParameters } from '@lifi/sdk';
import { EVM, executeRoute, config as lifiConfig } from '@lifi/sdk';
import type { Config } from '@wagmi/core';
import { getWalletClient } from '@wagmi/core';
import { Client, UserRejectedRequestError } from 'viem';

import { getExecutedLifiRouteTxHash } from '../util/LifiTransactionStatus';

type SwitchChainAsync = (parameters: { chainId: number }) => Promise<{ id: number } | undefined>;

type LifiRouteRunProps = {
  wagmiConfig: Config;
  switchChainAsync: SwitchChainAsync;
  onApprovalRequest?: (approvalRequest: TransactionParameters) => Promise<boolean>;
};

export type LifiRouteExecutionProps = LifiRouteRunProps & {
  onRouteExecutionError: (error: unknown) => void;
};

function configureLifiEvmProvider({
  wagmiConfig,
  switchChainAsync,
}: Pick<LifiRouteRunProps, 'wagmiConfig' | 'switchChainAsync'>) {
  lifiConfig.setProviders([
    EVM({
      getWalletClient: async () => {
        const walletClient = await getWalletClient(wagmiConfig);
        if (!walletClient) {
          throw new Error('LiFi SDK wallet client is unavailable.');
        }
        return walletClient as Client;
      },
      switchChain: async (chainId) => {
        await switchChainAsync({ chainId });

        const walletClient = await getWalletClient(wagmiConfig, { chainId });
        if (!walletClient) {
          throw new Error('LiFi SDK wallet client is unavailable after switching chain.');
        }
        return walletClient as Client;
      },
    }),
  ]);
}

function createExecutionOptions({
  wagmiConfig,
  switchChainAsync,
  onApprovalRequest,
}: LifiRouteRunProps): ExecutionOptions {
  configureLifiEvmProvider({ wagmiConfig, switchChainAsync });

  return {
    switchChainHook: async (chainId: number) => {
      await switchChainAsync({ chainId });

      const walletClient = await getWalletClient(wagmiConfig, { chainId });
      return walletClient as Client | undefined;
    },
    updateTransactionRequestHook: async ({ requestType, ...transactionRequest }) => {
      if (requestType === 'approve') {
        const approvalConfirmed = await onApprovalRequest?.(transactionRequest);

        if (approvalConfirmed === false) {
          throw new UserRejectedRequestError(new Error('User declined token approval'));
        }
      }

      return transactionRequest;
    },
  };
}

// LiFi's `executeRoute` resolves after route execution has finished, but the app needs the
// source-chain transaction hash as soon as it exists so it can create its history entry.
// EIP-5792 wallet batch ids are ignored until LiFi reports the real on-chain transaction hash.
export function executeLifiRoute(
  route: Route | RouteExtended,
  {
    wagmiConfig,
    switchChainAsync,
    onApprovalRequest,
    onRouteExecutionError,
  }: LifiRouteExecutionProps,
): Promise<{ txHash: string }> {
  const executionOptions = createExecutionOptions({
    wagmiConfig,
    switchChainAsync,
    onApprovalRequest,
  });

  return new Promise((resolve, reject) => {
    let resolvedRouteTx = false;

    const handleRouteUpdate = (updatedRoute: RouteExtended) => {
      const txHash = getExecutedLifiRouteTxHash(updatedRoute);
      if (txHash && !resolvedRouteTx) {
        resolvedRouteTx = true;
        resolve({ txHash });
      }
    };

    executeRoute(route, {
      ...executionOptions,
      updateRouteHook: handleRouteUpdate,
    })
      .then((updatedRoute) => {
        handleRouteUpdate(updatedRoute);
        if (!resolvedRouteTx) {
          reject(new Error('LiFi route execution completed without a route transaction hash.'));
        }
      })
      .catch((error) => {
        if (resolvedRouteTx) {
          onRouteExecutionError(error);
        } else {
          reject(error);
        }
      });
  });
}
