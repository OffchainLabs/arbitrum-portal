import type {
  ExecutionOptions,
  Route,
  RouteExtended,
  SDKProvider,
  TransactionParameters,
} from '@lifi/sdk';
import { EVM, Solana, executeRoute, config as lifiConfig, resumeRoute } from '@lifi/sdk';
import { Client, UserRejectedRequestError } from 'viem';

import {
  getExecutedLifiRouteTxHash,
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

function createExecutionOptions({
  signers,
  switchChainAsync,
  onApprovalRequest,
  onRouteUpdate,
}: LifiRouteRunProps): ExecutionOptions {
  configureLifiProviders({ signers, switchChainAsync });

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
    signers,
    switchChainAsync,
    onApprovalRequest,
    onRouteUpdate,
    onRouteExecutionError,
  }: LifiRouteExecutionProps,
): Promise<{ txHash: string; route: RouteExtended }> {
  const executionOptions = createExecutionOptions({
    signers,
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
  { signers, switchChainAsync, onApprovalRequest, onRouteUpdate }: LifiRouteRunProps,
): Promise<RouteExtended> {
  return resumeRoute(
    structuredClone(route),
    createExecutionOptions({
      signers,
      switchChainAsync,
      onApprovalRequest,
      onRouteUpdate,
    }),
  );
}
