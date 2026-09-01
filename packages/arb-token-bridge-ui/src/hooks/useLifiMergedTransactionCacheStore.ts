import type { RouteExtended } from '@lifi/sdk';
import { BigNumber } from 'ethers';
import { create } from 'zustand';
import { PersistOptions, persist } from 'zustand/middleware';

import type { AmountWithToken } from '../app/api/crosschain-transfers/types';
import { isSameTransaction } from '../components/TransactionHistory/helpers';
import { LifiMergedTransaction, WithdrawalStatus } from '../state/app/state';
import { getLifiRouteHistorySteps, getLifiTransactionSnapshot } from '../util/LifiRouteUtils';

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

const LIFI_CACHE_VERSION = 3 as const;

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

      let lastSubmittedProcessIndex = -1;
      execution.process.forEach((process, processIndex) => {
        if (process.txHash && process.status !== 'FAILED') {
          lastSubmittedProcessIndex = processIndex;
        }
      });

      return {
        ...stepWithoutTransactionRequest,
        execution: {
          ...execution,
          // This mirrors LiFi's prepareRestart: later transient/failed processes are regenerated.
          process: execution.process.slice(0, lastSubmittedProcessIndex + 1),
        },
      };
    }),
  };
}

function shouldPruneLifiRoute(tx: LifiMergedTransaction) {
  const routeIsComplete = tx.lifiRoute?.steps.every((step) => step.execution?.status === 'DONE');

  return (
    (tx.destinationStatus === WithdrawalStatus.CONFIRMED && routeIsComplete) ||
    tx.destinationStatus === WithdrawalStatus.REFUNDED ||
    tx.status === WithdrawalStatus.REFUNDED
  );
}

export function prepareLifiTransactionForStorage(tx: LifiMergedTransaction): LifiMergedTransaction {
  const routeForHistory = tx.lifiRoute;
  if (!routeForHistory) {
    return tx;
  }

  const lifiRoute = sanitizeLifiRouteForStorage(routeForHistory);
  const snapshot = getLifiTransactionSnapshot({ ...tx, lifiRoute: routeForHistory });
  if (!snapshot) {
    return { ...tx, lifiRoute };
  }

  const pruneLifiRoute = shouldPruneLifiRoute(tx);
  const lifiRouteSteps = getLifiRouteHistorySteps(routeForHistory);

  if (!pruneLifiRoute) {
    return {
      ...tx,
      lifiRoute,
      ...(lifiRouteSteps.length > 0 ? { lifiRouteSteps } : {}),
    };
  }

  const { lifiRoute: _lifiRoute, ...transactionWithoutRoute } = tx;

  return {
    ...transactionWithoutRoute,
    ...snapshot,
    ...(tx.toAmount ? { toAmount: tx.toAmount } : {}),
    lifiRouteSteps,
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

const persistOptions: PersistOptions<LifiMergedTransactionCacheState, Version3State> = {
  name: 'lifi-merged-transaction-cache',
  version: LIFI_CACHE_VERSION,
  partialize: (state) => ({ transactions: state.transactions }),
  // Zustand v4 types migrations as returning the full runtime state, although persisted
  // data is merged with the current state and intentionally excludes store actions.
  migrate: (persistedState, sourceVersion) =>
    migrateLifiCacheStateToVersion3(
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
            apply: (transactions) => [transactionToStore].concat(transactions),
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
