import type { ExecutionOptions, Route, RouteExtended, TransactionParameters } from '@lifi/sdk';
import { EVM, executeRoute, config as lifiConfig, resumeRoute } from '@lifi/sdk';
import type { Config } from '@wagmi/core';
import { getWalletClient } from '@wagmi/core';
import { Client, UserRejectedRequestError } from 'viem';

import {
  getExecutedLifiRouteTxHash,
  rejectPendingLifiRouteRequest,
} from '../util/LifiTransactionStatus';
import { isUserRejectedError } from '../util/isUserRejectedError';

type SwitchChainAsync = (parameters: { chainId: number }) => Promise<{ id: number } | undefined>;

type LifiRouteRunProps = {
  wagmiConfig: Config;
  switchChainAsync: SwitchChainAsync;
  onApprovalRequest?: (approvalRequest: TransactionParameters) => Promise<boolean>;
  onRouteUpdate?: (route: RouteExtended) => void;
};

export type LifiRouteExecutionProps = LifiRouteRunProps & {
  onRouteExecutionError: (error: unknown, route: RouteExtended | undefined) => void;
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
  onRouteUpdate,
}: LifiRouteRunProps): ExecutionOptions {
  configureLifiEvmProvider({ wagmiConfig, switchChainAsync });

  return {
    updateTransactionRequestHook: async ({ requestType, ...transactionRequest }) => {
      if (requestType === 'approve') {
        const approvalConfirmed = await onApprovalRequest?.(transactionRequest);

        if (approvalConfirmed === false) {
          throw new UserRejectedRequestError(new Error('User declined token approval'));
        }
      }

      return transactionRequest;
    },
    updateRouteHook: onRouteUpdate,
  };
}

export function executeLifiRoute(
  route: Route | RouteExtended,
  {
    wagmiConfig,
    switchChainAsync,
    onApprovalRequest,
    onRouteUpdate,
    onRouteExecutionError,
  }: LifiRouteExecutionProps,
): Promise<{ txHash: string; route: RouteExtended }> {
  const executionOptions = createExecutionOptions({
    wagmiConfig,
    switchChainAsync,
    onApprovalRequest,
  });

  return new Promise((resolve, reject) => {
    let resolvedRouteTx = false;
    let latestRoute: RouteExtended | undefined;

    const handleRouteUpdate = (updatedRoute: RouteExtended) => {
      latestRoute = updatedRoute;
      const txHash = getExecutedLifiRouteTxHash(updatedRoute);

      onRouteUpdate?.(updatedRoute);

      if (txHash && !resolvedRouteTx) {
        resolvedRouteTx = true;
        resolve({ txHash, route: updatedRoute });
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
        onRouteExecutionError(
          error,
          latestRoute && isUserRejectedError(error)
            ? rejectPendingLifiRouteRequest(latestRoute)
            : latestRoute,
        );
        if (resolvedRouteTx) {
          return;
        }
        reject(error);
      });
  });
}

export function resumeLifiRoute(
  route: Route | RouteExtended,
  { wagmiConfig, switchChainAsync, onApprovalRequest, onRouteUpdate }: LifiRouteRunProps,
): Promise<RouteExtended> {
  return resumeRoute(
    structuredClone(route),
    createExecutionOptions({
      wagmiConfig,
      switchChainAsync,
      onApprovalRequest,
      onRouteUpdate,
    }),
  );
}
