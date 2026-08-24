import type { RouteExtended } from '@lifi/sdk';
import { BigNumber } from 'ethers';
import { create } from 'zustand';
import { PersistOptions, persist } from 'zustand/middleware';

import type { AmountWithToken } from '../app/api/crosschain-transfers/types';
import { isSameTransaction } from '../components/TransactionHistory/helpers';
import { LifiMergedTransaction } from '../state/app/state';

interface LifiMergedTransactionCacheState {
  transactions: Record<string, LifiMergedTransaction[]>;
  addTransaction: (tx: LifiMergedTransaction) => void;
  updateTransaction: (tx: LifiMergedTransaction) => void;
}

const LIFI_CACHE_VERSION = 2 as const;

type LifiCachePersistedState<Transaction> = {
  transactions: Record<string, Transaction[]>;
};

type Version1State = LifiCachePersistedState<
  Omit<LifiMergedTransaction, 'fromAmount' | 'toAmount'> & {
    fromAmount: Omit<AmountWithToken, 'amount'> & {
      amount: string | BigNumber | { type?: string; hex?: string; _hex?: string };
    };
    toAmount: Omit<AmountWithToken, 'amount'> & {
      amount: string | BigNumber | { type?: string; hex?: string; _hex?: string };
    };
  }
>;

type Version2State = LifiCachePersistedState<LifiMergedTransaction>;

export function sanitizeLifiRouteForStorage(
  route: RouteExtended | undefined,
): RouteExtended | undefined {
  if (!route) {
    return undefined;
  }

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

function sanitizeTransactionForStorage(tx: LifiMergedTransaction): LifiMergedTransaction {
  if (!tx.lifiRoute) {
    return tx;
  }

  return { ...tx, lifiRoute: sanitizeLifiRouteForStorage(tx.lifiRoute) };
}

function normalizeVersion1Amount({
  amount,
  ...amountWithToken
}: Version1State['transactions'][string][number]['fromAmount']): AmountWithToken {
  if (typeof amount === 'string' || BigNumber.isBigNumber(amount)) {
    return { ...amountWithToken, amount: BigNumber.from(amount).toString() };
  }

  const serializedHex = amount.hex ?? amount._hex;
  return {
    ...amountWithToken,
    amount: BigNumber.from(serializedHex).toString(),
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

const persistOptions: PersistOptions<LifiMergedTransactionCacheState, Version2State> = {
  name: 'lifi-merged-transaction-cache',
  version: LIFI_CACHE_VERSION,
  partialize: (state) => ({ transactions: state.transactions }),
  // Zustand v4 types migrations as returning the full runtime state, although persisted
  // data is merged with the current state and intentionally excludes store actions.
  migrate: (persistedState, sourceVersion) => {
    if (sourceVersion !== 1) {
      throw new Error(
        `Cannot migrate LiFi transaction cache from version ${sourceVersion} to ${LIFI_CACHE_VERSION}.`,
      );
    }

    return migrateLifiCacheStateFromVersion1ToVersion2(
      persistedState as Version1State,
    ) as LifiMergedTransactionCacheState;
  },
};

export const useLifiMergedTransactionCacheStore = create<LifiMergedTransactionCacheState>()(
  persist(
    (set) => ({
      transactions: {},
      addTransaction: (tx) => {
        const sender = tx.sender;
        if (!sender) {
          return;
        }
        const transactionToStore = sanitizeTransactionForStorage(tx);
        set((state) => ({
          transactions: {
            [sender]: [transactionToStore].concat(state.transactions[sender] || []),
            // If transaction is sent to a custom destination address, make sure it's registered for that account too
            ...(tx.destination && tx.destination !== sender
              ? {
                  [tx.destination]: [transactionToStore].concat(
                    state.transactions[tx.destination] || [],
                  ),
                }
              : {}),
          },
        }));
      },
      updateTransaction: (tx) => {
        const sender = tx.sender;
        if (!sender) {
          return;
        }
        const transactionToStore = sanitizeTransactionForStorage(tx);

        function updateForAddress(transactions: LifiMergedTransaction[]) {
          return transactions.map((existing) =>
            isSameTransaction(existing, transactionToStore)
              ? { ...existing, ...transactionToStore }
              : existing,
          );
        }

        set((state) => {
          return {
            transactions: {
              [sender]: updateForAddress(state.transactions[sender] || []),
              ...(tx.destination && tx.destination !== sender
                ? {
                    [tx.destination]: updateForAddress(state.transactions[tx.destination] || []),
                  }
                : {}),
            },
          };
        });
      },
    }),
    persistOptions,
  ),
);
