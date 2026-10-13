import type {
  ExecutionOptions,
  Route,
  RouteExtended,
  SDKProvider,
  TransactionParameters,
} from '@lifi/sdk';
import {
  EVM,
  Solana,
  executeRoute,
  getActiveRoute,
  config as lifiConfig,
  resumeRoute,
} from '@lifi/sdk';
import { Client, UserRejectedRequestError } from 'viem';

import { addressesEqual } from '../util/AddressUtils';
import {
  getExecutedLifiRouteTxHash,
  getPendingLifiRouteBatchIds,
  rejectPendingLifiRouteRequest,
} from '../util/LifiTransactionStatus';
import { isUserRejectedError } from '../util/isUserRejectedError';
import { ecosystems } from '../wallet/ecosystems';
import type { Signers, WalletEcosystem } from '../wallet/types';

type SwitchChainAsync = (parameters: { chainId: number }) => Promise<{ id: number } | undefined>;

type LifiRouteRunProps = {
  /** Signers of the route's source and destination wallets */
  signers: Partial<Signers>;
  switchChainAsync: SwitchChainAsync;
  onApprovalRequest?: (approvalRequest: TransactionParameters) => Promise<boolean>;
  onRouteUpdate?: (route: RouteExtended) => void;
};

export type LifiRouteExecutionProps = LifiRouteRunProps & {
  onRouteExecutionError: (error: unknown, route: RouteExtended | undefined) => void;
};

export type LifiTransferOverrides = { executeRoute?: typeof executeLifiRoute };

type ProviderProps = Pick<LifiRouteRunProps, 'signers' | 'switchChainAsync'>;

const lifiProviders: {
  [E in WalletEcosystem]: (signer: Signers[E], props: ProviderProps) => SDKProvider;
} = {
  evm: (signer, { switchChainAsync }) =>
    EVM({
      getWalletClient: async () => (await signer.getWalletClient()) as Client,
      switchChain: async (chainId) => {
        await switchChainAsync({ chainId });
        return (await signer.getWalletClient(chainId)) as Client;
      },
    }),
  solana: (signer) => Solana({ getWalletAdapter: signer.getWalletAdapter }),
};

function createLifiProvider<E extends WalletEcosystem>(ecosystem: E, props: ProviderProps) {
  const signer = props.signers[ecosystem];
  return signer ? [lifiProviders[ecosystem](signer, props)] : [];
}

// Registers a provider for each enabled ecosystem that has a signer
function configureLifiProviders(props: ProviderProps) {
  lifiConfig.setProviders(
    (Object.keys(lifiProviders) as WalletEcosystem[])
      .filter((ecosystem) => ecosystems[ecosystem].isEnabled())
      .flatMap((ecosystem) => createLifiProvider(ecosystem, props)),
  );
}

// Steps run in order, so the first step that isn't done is the one requesting a signature. The
// sender's address format picks the signing wallet, since steps can start on chains the bridge
// doesn't list.
function assertSigningAccount(route: RouteExtended, signers: Partial<Signers>) {
  const sender = route.steps.find((routeStep) => routeStep.execution?.status !== 'DONE')?.action
    .fromAddress;
  const ecosystem = (Object.keys(ecosystems) as WalletEcosystem[]).find(
    (walletEcosystem) => sender && ecosystems[walletEcosystem].address.isValid(sender),
  );

  if (!ecosystem || !addressesEqual(signers[ecosystem]?.getAddress(), sender)) {
    throw new Error('The signing account changed. Reconnect the account that started this route.');
  }
}

function createExecutionOptions(
  route: RouteExtended,
  { signers, switchChainAsync, onApprovalRequest, onRouteUpdate }: LifiRouteRunProps,
): ExecutionOptions {
  configureLifiProviders({ signers, switchChainAsync });
  let latestRoute = route;

  return {
    updateTransactionRequestHook: async ({ requestType, ...transactionRequest }) => {
      if (requestType === 'approve') {
        const approvalConfirmed = await onApprovalRequest?.(transactionRequest);

        if (approvalConfirmed === false) {
          throw new UserRejectedRequestError(new Error('User declined token approval'));
        }
      }

      assertSigningAccount(latestRoute, signers);
      return transactionRequest;
    },
    updateRouteHook: (updatedRoute) => {
      latestRoute = updatedRoute;
      onRouteUpdate?.(updatedRoute);
    },
  };
}

export function executeLifiRoute(
  route: Route | RouteExtended,
  {
    signers,
    switchChainAsync,
    onApprovalRequest,
    onRouteUpdate,
    onRouteExecutionError,
  }: LifiRouteExecutionProps,
): Promise<{ txHash: string; route: RouteExtended }> {
  if (
    getActiveRoute(route.id) ||
    getExecutedLifiRouteTxHash(route) ||
    getPendingLifiRouteBatchIds(route).length > 0
  ) {
    return Promise.reject(
      new Error('This route has already started. Resume it from transaction history.'),
    );
  }

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

    executeRoute(
      route,
      createExecutionOptions(route, {
        signers,
        switchChainAsync,
        onApprovalRequest,
        onRouteUpdate: handleRouteUpdate,
      }),
    )
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
  { signers, switchChainAsync, onApprovalRequest, onRouteUpdate }: LifiRouteRunProps,
): Promise<RouteExtended> {
  return resumeRoute(
    structuredClone(route),
    createExecutionOptions(route, {
      signers,
      switchChainAsync,
      onApprovalRequest,
      onRouteUpdate,
    }),
  );
}
