import { BigNumber } from 'ethers';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { AmountWithToken, LifiMergedTransaction } from '../state/app/state';

interface LifiMergedTransactionCacheState {
  transactions: Record<string, LifiMergedTransaction[]>;
  addTransaction: (tx: LifiMergedTransaction) => void;
  updateTransaction: (tx: LifiMergedTransaction, updates?: Partial<LifiMergedTransaction>) => void;
}

type LegacyLifiTransaction = LifiMergedTransaction & {
  toolDetails?: { key: string; name: string; logoURI: string };
  transactionRequest?: unknown;
};

function deserializeAmount(amount: unknown) {
  if (amount && typeof amount === 'object') {
    const { hex, _hex } = amount as { hex?: unknown; _hex?: unknown };
    const serializedHex = typeof hex === 'string' ? hex : _hex;
    if (typeof serializedHex === 'string') {
      return BigNumber.from(serializedHex);
    }
  }

  return BigNumber.from(amount);
}

function normalizeAmount(amount: AmountWithToken | undefined) {
  return amount ? { ...amount, amount: deserializeAmount(amount.amount) } : undefined;
}

function migrateTransaction(transaction: LegacyLifiTransaction): LifiMergedTransaction {
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
    return currentTransaction;
  }

  return {
    ...currentTransaction,
    toolsDetails: toolsDetails ?? (toolDetails ? [toolDetails] : undefined),
    durationMs,
    fromAmount: normalizeAmount(fromAmount),
    toAmount: normalizeAmount(toAmount),
  };
}

function migratePersistedState(persistedState: unknown) {
  const state = persistedState as Pick<LifiMergedTransactionCacheState, 'transactions'>;

  return {
    ...state,
    transactions: Object.fromEntries(
      Object.entries(state.transactions ?? {}).map(([address, transactions]) => [
        address,
        transactions.map((transaction) => migrateTransaction(transaction as LegacyLifiTransaction)),
      ]),
    ),
  } as LifiMergedTransactionCacheState;
}

function updateTransaction(
  transactions: LifiMergedTransaction[],
  tx: LifiMergedTransaction,
  updates: Partial<LifiMergedTransaction>,
): LifiMergedTransaction[] {
  return transactions.map((existing) =>
    existing.txId === tx.txId ||
    (typeof existing.lifiRoute?.id === 'string' && existing.lifiRoute.id === tx.lifiRoute?.id)
      ? { ...existing, ...updates }
      : existing,
  );
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
        set((state) => ({
          transactions: {
            ...state.transactions,
            [sender]: [tx].concat(state.transactions[sender] || []),
            // If transaction is sent to a custom destination address, make sure it's registered for that account too
            ...(tx.destination && tx.destination !== sender
              ? {
                  [tx.destination]: [tx].concat(state.transactions[tx.destination] || []),
                }
              : {}),
          },
        }));
      },
      updateTransaction: (tx, updates = tx) => {
        const sender = tx.sender;
        if (!sender) {
          return;
        }

        set((state) => {
          return {
            transactions: {
              ...state.transactions,
              [sender]: updateTransaction(state.transactions[sender] || [], tx, updates),
              ...(tx.destination && tx.destination !== sender
                ? {
                    [tx.destination]: updateTransaction(
                      state.transactions[tx.destination] || [],
                      tx,
                      updates,
                    ),
                  }
                : {}),
            },
          };
        });
      },
    }),
    {
      name: 'lifi-merged-transaction-cache',
      version: 2,
      migrate: migratePersistedState,
    },
  ),
);
