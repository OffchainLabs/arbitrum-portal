import type { RouteExtended } from '@lifi/sdk';
import { BigNumber } from 'ethers';
import { create } from 'zustand';
import { PersistOptions, persist } from 'zustand/middleware';

import type { AmountWithToken } from '../app/api/crosschain-transfers/types';
import { isSameTransaction } from '../components/TransactionHistory/helpers';
import { LifiMergedTransaction, WithdrawalStatus } from '../state/app/state';
import { getLifiRouteHistorySteps, getLifiTransactionSnapshot } from '../util/LifiRouteUtils';
import { isLifiRouteComplete } from '../util/LifiTransactionStatus';

interface LifiMergedTransactionCacheState {
  transactions: Record<string, LifiMergedTransaction[]>;
  addTransaction: (tx: LifiMergedTransaction) => void;
  updateTransaction: (tx: LifiMergedTransaction, updates?: Partial<LifiMergedTransaction>) => void;
  removeTransaction: (tx: LifiMergedTransaction) => void;
}

type LifiCachePersistedState<Transaction> = {
  transactions: Record<string, Transaction[]>;
};

type Version1State = LifiCachePersistedState<
  Omit<
    LifiMergedTransaction & {
      toolDetails?: { key: string; name: string; logoURI: string };
      transactionRequest?: unknown;
    },
    'fromAmount' | 'toAmount'
  > & {
    fromAmount?: Omit<AmountWithToken, 'amount'> & {
      amount: string | BigNumber | { type?: string; hex?: string; _hex?: string };
    };
    toAmount?: Omit<AmountWithToken, 'amount'> & {
      amount: string | BigNumber | { type?: string; hex?: string; _hex?: string };
    };
  }
>;

type Version2State = LifiCachePersistedState<
  LifiMergedTransaction & {
    toolDetails?: { key: string; name: string; logoURI: string };
    transactionRequest?: unknown;
  }
>;

type Version3State = LifiCachePersistedState<LifiMergedTransaction>;

type Version4State = LifiCachePersistedState<LifiMergedTransaction>;

const LIFI_CACHE_VERSION = 4 as const;

export function sanitizeLifiRouteForStorage(route: RouteExtended): RouteExtended {
  return {
    ...route,
    steps: route.steps.map((step) => {
      const {
        transactionRequest: _transactionRequest,
        execution,
        ...stepWithoutTransactionRequest
      } = step;
      if (!execution) {
        return stepWithoutTransactionRequest;
      }

      return {
        ...stepWithoutTransactionRequest,
        execution: {
          ...execution,
          process: execution.process.map(({ error: _error, ...process }) => process),
        },
      };
    }),
  };
}

function shouldPruneLifiRoute(tx: LifiMergedTransaction) {
  return (
    (tx.destinationStatus === WithdrawalStatus.CONFIRMED && isLifiRouteComplete(tx.lifiRoute)) ||
    tx.destinationStatus === WithdrawalStatus.REFUNDED ||
    tx.status === WithdrawalStatus.REFUNDED
  );
}

export function prepareLifiTransactionForStorage(tx: LifiMergedTransaction): LifiMergedTransaction {
  const routeForHistory = tx.lifiRoute;
  if (!routeForHistory) {
    return tx;
  }

  if (shouldPruneLifiRoute(tx)) {
    const snapshot = getLifiTransactionSnapshot(tx);
    if (snapshot) {
      const { lifiRoute: _lifiRoute, ...transactionWithoutRoute } = tx;
      return {
        ...transactionWithoutRoute,
        ...snapshot,
        lifiRouteSteps: getLifiRouteHistorySteps(routeForHistory),
      };
    }
  }
  const { lifiRouteSteps: _lifiRouteSteps, ...transactionWithoutHistorySteps } = tx;
  return {
    ...transactionWithoutHistorySteps,
    lifiRoute: sanitizeLifiRouteForStorage(routeForHistory),
  };
}

function normalizeVersion1Amount(
  amount: Version1State['transactions'][string][number]['fromAmount'],
): AmountWithToken | undefined {
  if (!amount) {
    return undefined;
  }

  const { amount: legacyAmount, ...amountWithToken } = amount;
  if (typeof legacyAmount === 'string' || BigNumber.isBigNumber(legacyAmount)) {
    return { ...amountWithToken, amount: BigNumber.from(legacyAmount).toString() };
  }

  return {
    ...amountWithToken,
    amount: BigNumber.from(legacyAmount.hex ?? legacyAmount._hex).toString(),
  };
}

export function migrateLifiCacheStateFromVersion1ToVersion2(
  persistedState: Version1State,
): Version2State {
  return {
    transactions: Object.fromEntries(
      Object.entries(persistedState.transactions).map(([address, transactions]) => [
        address,
        transactions.map((transaction) => ({
          ...transaction,
          fromAmount: normalizeVersion1Amount(transaction.fromAmount),
          toAmount: normalizeVersion1Amount(transaction.toAmount),
        })),
      ]),
    ),
  };
}

export function migrateLifiTransactionFromVersion2ToVersion3(
  transaction: Version2State['transactions'][string][number],
): LifiMergedTransaction {
  const {
    toolDetails,
    transactionRequest: _transactionRequest,
    toolsDetails,
    durationMs,
    fromAmount,
    toAmount,
    ...currentTransaction
  } = transaction;

  if (currentTransaction.lifiRoute?.steps.length) {
    return prepareLifiTransactionForStorage(currentTransaction as LifiMergedTransaction);
  }

  return {
    ...currentTransaction,
    toolsDetails: toolsDetails ?? (toolDetails ? [toolDetails] : undefined),
    durationMs,
    fromAmount,
    toAmount,
  };
}

export function migrateLifiCacheStateFromVersion2ToVersion3(
  persistedState: Version2State,
): Version3State {
  return {
    transactions: Object.fromEntries(
      Object.entries(persistedState.transactions).map(([address, transactions]) => [
        address,
        transactions.map(migrateLifiTransactionFromVersion2ToVersion3),
      ]),
    ),
  };
}

export function migrateLifiCacheStateToVersion3(
  persistedState: unknown,
  sourceVersion: number,
): Version3State {
  switch (sourceVersion) {
    case 1:
      return migrateLifiCacheStateFromVersion2ToVersion3(
        migrateLifiCacheStateFromVersion1ToVersion2(persistedState as Version1State),
      );
    case 2:
      return migrateLifiCacheStateFromVersion2ToVersion3(persistedState as Version2State);
    default:
      throw new Error(`Version 3 migration does not support source version ${sourceVersion}.`);
  }
}

/**
 * LiFi SDK versions before 3.10.2 wrote two process types that later versions dropped:
 * `SWITCH_CHAIN` (a network switch, never with a tx hash) and `TRANSACTION` (only used to
 * record a wallet mismatch failure, also without a hash). Drop the first, and rename the
 * second to the step's transfer type, which is where newer SDKs record that failure. If the
 * step already has a transfer process, the legacy one is dropped instead, so a resumed route
 * never has two processes of the same type.
 */
export function migrateLifiProcessesToVersion4<Process extends { type: string }>(
  processes: Process[],
  transferType: 'CROSS_CHAIN' | 'SWAP',
): Process[] {
  const hasTransferProcess = processes.some((process) => process.type === transferType);

  return processes.flatMap((process) => {
    if (process.type === 'SWITCH_CHAIN') {
      return [];
    }
    if (process.type === 'TRANSACTION') {
      return hasTransferProcess ? [] : [{ ...process, type: transferType }];
    }
    return [process];
  });
}

function getLifiTransferProcessType(fromChainId: number, toChainId: number) {
  return fromChainId === toChainId ? 'SWAP' : 'CROSS_CHAIN';
}

export function migrateLifiTransactionFromVersion3ToVersion4(
  transaction: LifiMergedTransaction,
): LifiMergedTransaction {
  const { lifiRoute, lifiRouteSteps } = transaction;

  return {
    ...transaction,
    ...(lifiRoute && {
      lifiRoute: {
        ...lifiRoute,
        steps: lifiRoute.steps.map((step) =>
          step.execution
            ? {
                ...step,
                execution: {
                  ...step.execution,
                  process: migrateLifiProcessesToVersion4(
                    step.execution.process,
                    getLifiTransferProcessType(step.action.fromChainId, step.action.toChainId),
                  ),
                },
              }
            : step,
        ),
      },
    }),
    // History steps only keep the source chain; the app treats SWAP and CROSS_CHAIN alike there.
    ...(lifiRouteSteps && {
      lifiRouteSteps: lifiRouteSteps.map((step) =>
        step.execution
          ? {
              ...step,
              execution: {
                ...step.execution,
                process: migrateLifiProcessesToVersion4(
                  step.execution.process,
                  getLifiTransferProcessType(
                    transaction.sourceChainId,
                    transaction.destinationChainId,
                  ),
                ),
              },
            }
          : step,
      ),
    }),
  };
}

export function migrateLifiCacheStateToVersion4(
  persistedState: unknown,
  sourceVersion: number,
): Version4State {
  const version3State =
    sourceVersion === 3
      ? (persistedState as Version3State)
      : migrateLifiCacheStateToVersion3(persistedState, sourceVersion);

  return {
    transactions: Object.fromEntries(
      Object.entries(version3State.transactions).map(([address, transactions]) => [
        address,
        transactions.map(migrateLifiTransactionFromVersion3ToVersion4),
      ]),
    ),
  };
}

const persistOptions: PersistOptions<LifiMergedTransactionCacheState, Version4State> = {
  name: 'lifi-merged-transaction-cache',
  version: LIFI_CACHE_VERSION,
  partialize: (state) => ({ transactions: state.transactions }),
  // Zustand v4 types migrations as returning the full runtime state, although persisted
  // data is merged with the current state and intentionally excludes store actions.
  migrate: (persistedState, sourceVersion) =>
    migrateLifiCacheStateToVersion4(
      persistedState,
      sourceVersion,
    ) as LifiMergedTransactionCacheState,
};

function updateTransactions(
  transactions: LifiMergedTransaction[],
  tx: LifiMergedTransaction,
  updates: Partial<LifiMergedTransaction>,
): LifiMergedTransaction[] {
  return transactions.map((existing) =>
    isSameTransaction(existing, tx)
      ? prepareLifiTransactionForStorage({ ...existing, ...updates })
      : existing,
  );
}

function applyToTransactionAddresses({
  transactions,
  sender,
  destination,
  apply,
}: {
  transactions: Record<string, LifiMergedTransaction[]>;
  sender: string;
  destination: string | undefined;
  apply: (transactions: LifiMergedTransaction[]) => LifiMergedTransaction[];
}): Record<string, LifiMergedTransaction[]> {
  const updatedTransactions = {
    ...transactions,
    [sender]: apply(transactions[sender] || []),
  };

  if (destination && destination !== sender) {
    updatedTransactions[destination] = apply(transactions[destination] || []);
  }

  return updatedTransactions;
}

export const useLifiMergedTransactionCacheStore = create<LifiMergedTransactionCacheState>()(
  persist(
    (set) => ({
      transactions: {},
      addTransaction: (tx) => {
        const sender = tx.sender;
        if (!sender) {
          return;
        }
        const transactionToStore = prepareLifiTransactionForStorage(tx);
        set((state) => ({
          transactions: applyToTransactionAddresses({
            transactions: state.transactions,
            sender,
            destination: tx.destination,
            apply: (transactions) => [
              transactionToStore,
              ...transactions.filter(
                (existing) => !isSameTransaction(existing, transactionToStore),
              ),
            ],
          }),
        }));
      },
      updateTransaction: (tx, updates = tx) => {
        const sender = tx.sender;
        if (!sender) {
          return;
        }

        set((state) => ({
          transactions: applyToTransactionAddresses({
            transactions: state.transactions,
            sender,
            destination: tx.destination,
            apply: (transactions) => updateTransactions(transactions, tx, updates),
          }),
        }));
      },
      removeTransaction: (tx) => {
        const sender = tx.sender;
        if (!sender) {
          return;
        }

        set((state) => ({
          transactions: applyToTransactionAddresses({
            transactions: state.transactions,
            sender,
            destination: tx.destination,
            apply: (transactions) =>
              transactions.filter((existing) => !isSameTransaction(existing, tx)),
          }),
        }));
      },
    }),
    persistOptions,
  ),
);
