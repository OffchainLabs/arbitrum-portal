import {
  type TransferCallbacks,
  type TransferSubmission,
  executeTransfer,
} from '../application/executeTransfer';
import { createBalanceClientResolver } from '../wallet/balance/getBalanceClient';
import type { BalanceClient, WalletEcosystem } from '../wallet/types';

export function checkEcosystemRegistrationTypes(
  client: BalanceClient,
  snapshot: TransferSubmission,
  callbacks: TransferCallbacks,
  ecosystemForChain: (chainId: number) => WalletEcosystem | 'fixture',
) {
  const execute = async () => {};
  createBalanceClientResolver({ evm: client, solana: client });

  // @ts-expect-error Every production ecosystem needs a balance client.
  createBalanceClientResolver({ evm: client });
  // @ts-expect-error Every production ecosystem needs a balance client.
  createBalanceClientResolver({ solana: client });

  const incompleteClients = { evm: client, solana: client };
  // @ts-expect-error The resolver can return fixture, so fixture needs a client.
  createBalanceClientResolver(incompleteClients, ecosystemForChain);

  const incompleteExecutors = { evm: execute, solana: execute };
  // @ts-expect-error The resolver can return fixture, so fixture needs an executor.
  executeTransfer(snapshot, callbacks, incompleteExecutors, ecosystemForChain);
  // @ts-expect-error Custom executors must include an ecosystem resolver.
  executeTransfer(snapshot, callbacks, incompleteExecutors);

  createBalanceClientResolver({ ...incompleteClients, fixture: client }, ecosystemForChain);
  executeTransfer(
    snapshot,
    callbacks,
    { ...incompleteExecutors, fixture: execute },
    ecosystemForChain,
  );
}
