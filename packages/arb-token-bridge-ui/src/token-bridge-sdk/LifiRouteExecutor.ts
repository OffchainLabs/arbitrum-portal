import type { ExecutionOptions, Route, RouteExtended, TransactionParameters } from '@lifi/sdk';
import { executeRoute, getActiveRoute, resumeRoute } from '@lifi/sdk';
import type { Config } from '@wagmi/core';
import { getAccount } from '@wagmi/core';
import { UserRejectedRequestError } from 'viem';

import { addressesEqual } from '../util/AddressUtils';
import {
  getExecutedLifiRouteTxHash,
  getPendingLifiRouteBatchIds,
  rejectPendingLifiRouteRequest,
} from '../util/LifiTransactionStatus';
import { isUserRejectedError } from '../util/isUserRejectedError';

type LifiRouteRunProps = {
  wagmiConfig: Config;
  onApprovalRequest?: (approvalRequest: TransactionParameters) => Promise<boolean>;
  onRouteUpdate?: (route: RouteExtended) => void;
};

type LifiRouteResumeProps = LifiRouteRunProps & {
  switchChainAsync?: (parameters: { chainId: number }) => Promise<unknown>;
};

export type LifiRouteExecutionProps = LifiRouteRunProps & {
  onRouteExecutionError: (error: unknown, route: RouteExtended | undefined) => void;
  onRouteExecutionComplete?: (route: RouteExtended) => void;
};

function createExecutionOptions(
  { wagmiConfig, onApprovalRequest, onRouteUpdate }: LifiRouteRunProps,
  expectedAccount: string | undefined,
): ExecutionOptions {
  return {
    updateTransactionRequestHook: async ({ requestType, ...transactionRequest }) => {
      if (requestType === 'approve') {
        const approvalConfirmed = await onApprovalRequest?.(transactionRequest);

        if (approvalConfirmed === false) {
          throw new UserRejectedRequestError(new Error('User declined token approval'));
        }
      }

      const account = getAccount(wagmiConfig).address;
      if (!expectedAccount || !addressesEqual(account, expectedAccount)) {
        throw new Error(
          'The signing account changed. Reconnect the account that started this route.',
        );
      }
      return transactionRequest;
    },
    updateRouteHook: onRouteUpdate,
  };
}

// LiFi's `executeRoute` resolves after route execution has finished, but the app needs the
// submitted route tx id as soon as it exists so it can create history/cache entries. With
// EIP-5792 this can initially be a wallet batch id; later route updates replace it with the
// real on-chain tx hash for status checks and LiFi Scan links.
function runLifiRoute(
  route: Route | RouteExtended,
  {
    wagmiConfig,
    onApprovalRequest,
    onRouteUpdate,
    onRouteExecutionError,
    onRouteExecutionComplete,
  }: LifiRouteExecutionProps,
  run: typeof executeRoute = executeRoute,
): Promise<{ txHash: string; route: RouteExtended }> {
  const executionOptions = createExecutionOptions(
    {
      wagmiConfig,
      onApprovalRequest,
      onRouteUpdate,
    },
    route.fromAddress,
  );

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

    run(route, {
      ...executionOptions,
      updateRouteHook: handleRouteUpdate,
    })
      .then((updatedRoute) => {
        handleRouteUpdate(updatedRoute);
        onRouteExecutionComplete?.(updatedRoute);
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
export function executeLifiRoute(route: Route | RouteExtended, callbacks: LifiRouteExecutionProps) {
  if (
    getActiveRoute(route.id) ||
    getExecutedLifiRouteTxHash(route) ||
    getPendingLifiRouteBatchIds(route).length > 0
  ) {
    return Promise.reject(
      new Error('This route has already started. Resume it from transaction history.'),
    );
  }
  return runLifiRoute(route, callbacks);
}

export function resumeLifiRoute(route: RouteExtended, callbacks: LifiRouteResumeProps) {
  return resumeRoute(structuredClone(route), createExecutionOptions(callbacks, route.fromAddress));
}
