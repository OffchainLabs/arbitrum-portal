import { act, renderHook, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import { BigNumber, constants } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shallow } from 'zustand/shallow';

import { DepositStatus, LifiMergedTransaction, WithdrawalStatus } from '../state/app/state';
import { getLifiTransactionSnapshot } from '../util/LifiRouteUtils';
import { AssetType } from './arbTokenBridge.types';
import {
  migrateLifiCacheStateFromVersion1ToVersion2,
  migrateLifiCacheStateFromVersion2ToVersion3,
  migrateLifiCacheStateToVersion3,
  migrateLifiTransactionFromVersion2ToVersion3,
  prepareLifiTransactionForStorage,
  sanitizeLifiRouteForStorage,
  useLifiMergedTransactionCacheStore,
} from './useLifiMergedTransactionCacheStore';

const localStorageMock = vi.hoisted(() => {
  const storage = new Map<string, string>();
  const localStorage = {
    get length() {
      return storage.size;
    },
    clear: () => storage.clear(),
    getItem: (key: string) => storage.get(key) ?? null,
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    removeItem: (key: string) => storage.delete(key),
    setItem: (key: string, value: string) => storage.set(key, value),
  };

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage,
  });

  return localStorage;
});

function createMockedLifiTransaction({
  hash,
  sender,
  destinationAddress,
}: {
  hash: string;
  sender: string;
  destinationAddress: string;
}): LifiMergedTransaction {
  return {
    txId: hash,
    asset: 'ETH',
    assetType: AssetType.ETH,
    blockNum: null,
    createdAt: dayjs().valueOf(),
    direction: 'withdraw',
    isWithdrawal: true,
    resolvedAt: null,
    status: WithdrawalStatus.UNCONFIRMED,
    destinationStatus: WithdrawalStatus.UNCONFIRMED,
    uniqueId: null,
    value: '0',
    depositStatus: DepositStatus.LIFI_DEFAULT_STATE,
    destination: destinationAddress ?? sender,
    sender,
    isLifi: true,
    tokenAddress: constants.AddressZero,
    parentChainId: 1,
    childChainId: 42161,
    sourceChainId: 42161,
    destinationChainId: 1,
    toolsDetails: [
      {
        key: 'lifi',
        logoURI: '',
        name: 'name',
      },
    ],
    durationMs: 1_000,
    fromAmount: {
      amount: '10',
      amountUSD: '10',
      token: {
        address: constants.AddressZero,
        decimals: 18,
        symbol: 'ETH',
      },
    },
    toAmount: {
      amount: '9',
      amountUSD: '9',
      token: {
        address: constants.AddressZero,
        decimals: 18,
        symbol: 'ETH',
      },
    },
    destinationTxId: null,
  };
}

describe.sequential('useLifiMergedTransactionCacheStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useLifiMergedTransactionCacheStore.setState({ transactions: {} });
  });

  it('should return undefined by default', async () => {
    const walletAddress = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';
    const { result } = renderHook(() =>
      useLifiMergedTransactionCacheStore((state) => state.transactions[walletAddress]),
    );

    expect(result.current).toEqual(undefined);
  });

  it('hydrates legacy version 1 single-step transactions', async () => {
    const walletAddress = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';
    const legacyTransaction = createMockedLifiTransaction({
      hash: '0x240c2c89b5f153b0cc1fce5ea709473b858359887d0aa1d4157fe130c95d2134',
      sender: walletAddress,
      destinationAddress: walletAddress,
    });
    const { toolsDetails, ...transactionWithoutToolsDetails } = legacyTransaction;

    localStorageMock.setItem(
      'lifi-merged-transaction-cache',
      JSON.stringify({
        state: {
          transactions: {
            [walletAddress]: [
              {
                ...transactionWithoutToolsDetails,
                toolDetails: toolsDetails?.[0],
                fromAmount: {
                  ...transactionWithoutToolsDetails.fromAmount,
                  amount: BigNumber.from(10),
                },
                toAmount: {
                  ...transactionWithoutToolsDetails.toAmount,
                  amount: BigNumber.from(9),
                },
              },
            ],
          },
        },
        version: 1,
      }),
    );

    await useLifiMergedTransactionCacheStore.persist.rehydrate();

    const [hydratedTransaction] =
      useLifiMergedTransactionCacheStore.getState().transactions[walletAddress] ?? [];
    const snapshot = hydratedTransaction
      ? getLifiTransactionSnapshot(hydratedTransaction)
      : undefined;

    expect(snapshot?.fromAmount.amount).toBe('10');
    expect(snapshot?.toAmount.amount).toBe('9');
    expect(snapshot?.toolsDetails).toEqual(toolsDetails);
    expect(hydratedTransaction).not.toHaveProperty('toolDetails');
  });

  it('migrates route-backed transactions to the route-only shape', async () => {
    const walletAddress = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';
    const transaction = createMockedLifiTransaction({
      hash: '0x240c2c89b5f153b0cc1fce5ea709473b858359887d0aa1d4157fe130c95d2134',
      sender: walletAddress,
      destinationAddress: walletAddress,
    });
    const lifiRoute = { id: 'route-id', steps: [{}] } as LifiMergedTransaction['lifiRoute'];

    localStorageMock.setItem(
      'lifi-merged-transaction-cache',
      JSON.stringify({
        state: {
          transactions: {
            [walletAddress]: [{ ...transaction, lifiRoute }],
          },
        },
        version: 1,
      }),
    );

    await useLifiMergedTransactionCacheStore.persist.rehydrate();

    const [hydratedTransaction] =
      useLifiMergedTransactionCacheStore.getState().transactions[walletAddress] ?? [];

    expect(hydratedTransaction?.lifiRoute).toEqual(lifiRoute);
    expect(hydratedTransaction).not.toHaveProperty('toolsDetails');
    expect(hydratedTransaction).not.toHaveProperty('durationMs');
    expect(hydratedTransaction).not.toHaveProperty('fromAmount');
    expect(hydratedTransaction).not.toHaveProperty('toAmount');
  });

  it('should cache transaction for sender and destination address', async () => {
    const walletAddress = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';
    const { result } = renderHook(() =>
      useLifiMergedTransactionCacheStore(
        (state) => ({
          addTransaction: state.addTransaction,
          transactions: state.transactions,
        }),
        shallow,
      ),
    );

    const sameDestinationTransaction = createMockedLifiTransaction({
      hash: '0x240c2c89b5f153b0cc1fce5ea709473b858359887d0aa1d4157fe130c95d2134',
      sender: walletAddress,
      destinationAddress: walletAddress,
    });
    await act(async () => {
      result.current.addTransaction(sameDestinationTransaction);
    });

    await waitFor(() => {
      // Transaction is added to cache only once
      expect(result.current.transactions[walletAddress]).toEqual([sameDestinationTransaction]);
    });

    const customDestinationAddress = '0x7503Aad60fd0d205702b0Dcd945a1b36c42101b3';
    const differentDestinationTransaction = createMockedLifiTransaction({
      hash: '0x7aca61daf6b90259aa8e40a57cba32a234650fa681691c53a0de09187226694c',
      sender: walletAddress,
      destinationAddress: customDestinationAddress,
    });
    await act(async () => {
      result.current.addTransaction(differentDestinationTransaction);
    });

    const { result: resultAfterChanges } = renderHook(() =>
      useLifiMergedTransactionCacheStore(
        (state) => ({
          addTransaction: state.addTransaction,
          transactions: state.transactions,
        }),
        shallow,
      ),
    );
    await waitFor(() => {
      // Transaction is added to cache for sender
      expect(resultAfterChanges.current.transactions[walletAddress]).toEqual([
        differentDestinationTransaction,
        sameDestinationTransaction,
      ]);

      // Transaction is added to cache for custom address
      expect(resultAfterChanges.current.transactions[customDestinationAddress]).toEqual([
        differentDestinationTransaction,
      ]);
    });
  });

  it('should update cached transaction for sender and destination address', async () => {
    const walletAddress = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';
    const customDestinationAddress = '0x7503Aad60fd0d205702b0Dcd945a1b36c42101b3';
    const { result } = renderHook(() =>
      useLifiMergedTransactionCacheStore(
        (state) => ({
          addTransaction: state.addTransaction,
          updateTransaction: state.updateTransaction,
          transactions: state.transactions,
        }),
        shallow,
      ),
    );

    const originalTransaction = createMockedLifiTransaction({
      hash: '0x7aca61daf6b90259aa8e40a57cba32a234650fa681691c53a0de09187226694c',
      sender: walletAddress,
      destinationAddress: customDestinationAddress,
    });

    await act(async () => {
      result.current.addTransaction(originalTransaction);
    });

    const updatedTransaction = {
      ...originalTransaction,
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.CONFIRMED,
    };

    await act(async () => {
      result.current.updateTransaction(updatedTransaction);
    });

    await waitFor(() => {
      expect(result.current.transactions[walletAddress]).toEqual([updatedTransaction]);
      expect(result.current.transactions[customDestinationAddress]).toEqual([updatedTransaction]);
    });
  });

  it('should update only route metadata without overwriting fresher transaction state', async () => {
    const walletAddress = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';
    const { result } = renderHook(() =>
      useLifiMergedTransactionCacheStore(
        (state) => ({
          addTransaction: state.addTransaction,
          updateTransaction: state.updateTransaction,
          transactions: state.transactions,
        }),
        shallow,
      ),
    );

    const originalTransaction = createMockedLifiTransaction({
      hash: '0x7aca61daf6b90259aa8e40a57cba32a234650fa681691c53a0de09187226694c',
      sender: walletAddress,
      destinationAddress: walletAddress,
    });

    const currentTransaction = {
      ...originalTransaction,
      status: WithdrawalStatus.CONFIRMED,
    };
    const lifiRoute = {
      id: 'route-id',
      steps: [],
    } as unknown as LifiMergedTransaction['lifiRoute'];

    await act(async () => {
      result.current.addTransaction(currentTransaction);
      result.current.updateTransaction(originalTransaction, { lifiRoute });
    });

    await waitFor(() => {
      expect(result.current.transactions[walletAddress]).toEqual([
        {
          ...currentTransaction,
          lifiRoute,
        },
      ]);
    });
  });

  it('should update cached transaction txId when the route id matches', async () => {
    const walletAddress = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';
    const { result } = renderHook(() =>
      useLifiMergedTransactionCacheStore(
        (state) => ({
          addTransaction: state.addTransaction,
          updateTransaction: state.updateTransaction,
          transactions: state.transactions,
        }),
        shallow,
      ),
    );

    const originalTransaction = {
      ...createMockedLifiTransaction({
        hash: '0x3ed2270c44494ccfa9c60daf655e7879',
        sender: walletAddress,
        destinationAddress: walletAddress,
      }),
      lifiRoute: {
        id: 'route-id',
        steps: [],
      } as unknown as LifiMergedTransaction['lifiRoute'],
    };
    const transactionWithRealHash = {
      ...originalTransaction,
      txId: '0xa0231341aef0576cd9467d1506011d1dd041167762db0d2b1657678e3c0c5255',
    };

    await act(async () => {
      result.current.addTransaction(originalTransaction);
      result.current.updateTransaction(transactionWithRealHash);
    });

    await waitFor(() => {
      expect(result.current.transactions[walletAddress]).toEqual([transactionWithRealHash]);
    });
  });
});

describe('cache migrations', () => {
  const walletAddress = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';

  it('migrates version 1 amounts to version 2 strings', () => {
    const transaction = createMockedLifiTransaction({
      hash: '0x240c2c89b5f153b0cc1fce5ea709473b858359887d0aa1d4157fe130c95d2134',
      sender: walletAddress,
      destinationAddress: walletAddress,
    });
    const { fromAmount, toAmount } = transaction;
    if (!fromAmount || !toAmount) {
      throw new Error('Expected mocked transaction amounts');
    }

    const migrated = migrateLifiCacheStateFromVersion1ToVersion2({
      transactions: {
        [walletAddress]: [
          {
            ...transaction,
            fromAmount: { ...fromAmount, amount: { hex: '0x0a' } },
            toAmount: { ...toAmount, amount: { _hex: '0x09' } },
          },
        ],
      },
    });
    const [migratedTransaction] = migrated.transactions[walletAddress] ?? [];

    expect(migratedTransaction).toMatchObject({
      fromAmount: { amount: '10' },
      toAmount: { amount: '9' },
    });
  });

  it('migrates an empty version 2 cache to version 3', () => {
    expect(migrateLifiCacheStateFromVersion2ToVersion3({ transactions: {} })).toEqual({
      transactions: {},
    });
  });

  it.each([1, 2])('migrates version %i single-step snapshots to version 3', (sourceVersion) => {
    const transaction = createMockedLifiTransaction({
      hash: '0x240c2c89b5f153b0cc1fce5ea709473b858359887d0aa1d4157fe130c95d2134',
      sender: walletAddress,
      destinationAddress: walletAddress,
    });
    const { toolsDetails, ...transactionWithoutToolsDetails } = transaction;
    const persistedTransaction = {
      ...transactionWithoutToolsDetails,
      toolDetails: toolsDetails?.[0],
      transactionRequest: { to: walletAddress },
      ...(sourceVersion === 1
        ? {
            fromAmount: transactionWithoutToolsDetails.fromAmount
              ? {
                  ...transactionWithoutToolsDetails.fromAmount,
                  amount: { hex: '0x0a' },
                }
              : undefined,
            toAmount: transactionWithoutToolsDetails.toAmount
              ? {
                  ...transactionWithoutToolsDetails.toAmount,
                  amount: { hex: '0x09' },
                }
              : undefined,
          }
        : {}),
    };
    const persistedState = {
      transactions: { [walletAddress]: [persistedTransaction] },
    };

    const migrated = migrateLifiCacheStateToVersion3(persistedState, sourceVersion);
    const [migratedTransaction] = migrated.transactions[walletAddress] ?? [];

    expect(migratedTransaction).toMatchObject({
      toolsDetails,
      fromAmount: { amount: '10' },
      toAmount: { amount: '9' },
    });
    expect(migratedTransaction).not.toHaveProperty('toolDetails');
    expect(migratedTransaction).not.toHaveProperty('transactionRequest');
  });

  it('rejects source versions without a defined migration path', () => {
    expect(() => migrateLifiCacheStateToVersion3({ transactions: {} }, 0)).toThrow(
      'Version 3 migration does not support source version 0.',
    );
  });
});

describe('version 3 transaction migration', () => {
  const walletAddress = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';

  it('removes redundant snapshot fields from route-backed transactions', () => {
    const transaction = createMockedLifiTransaction({
      hash: '0x240c2c89b5f153b0cc1fce5ea709473b858359887d0aa1d4157fe130c95d2134',
      sender: walletAddress,
      destinationAddress: walletAddress,
    });
    const lifiRoute = {
      id: 'route-id',
      steps: [{}],
    } as LifiMergedTransaction['lifiRoute'];

    const migrated = migrateLifiTransactionFromVersion2ToVersion3({ ...transaction, lifiRoute });

    expect(migrated.lifiRoute).toEqual(lifiRoute);
    expect(migrated).not.toHaveProperty('toolsDetails');
    expect(migrated).not.toHaveProperty('durationMs');
    expect(migrated).not.toHaveProperty('fromAmount');
    expect(migrated).not.toHaveProperty('toAmount');
  });
});

describe('route storage compaction', () => {
  const walletAddress = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';
  const route = {
    id: 'route-id',
    steps: [
      {
        id: 'step-id',
        toolDetails: { key: 'relay', name: 'Relay', logoURI: '' },
        action: {
          fromAddress: walletAddress,
          fromAmount: '10',
          fromChainId: 42161,
          fromToken: {
            address: constants.AddressZero,
            chainId: 42161,
            decimals: 18,
            symbol: 'ETH',
          },
          toChainId: 1,
          toToken: {
            address: constants.AddressZero,
            chainId: 1,
            decimals: 18,
            symbol: 'ETH',
          },
        },
        estimate: {
          executionDuration: 10,
          fromAmountUSD: '10',
          toAmount: '9',
          toAmountUSD: '9',
        },
        transactionRequest: { data: '0xlarge-calldata' },
        execution: {
          status: 'DONE',
          toAmount: '9',
          process: [
            { type: 'TOKEN_ALLOWANCE', status: 'DONE' },
            {
              type: 'CROSS_CHAIN',
              status: 'DONE',
              txHash: '0xsource',
              txLink: 'https://example.com/tx/source',
            },
            {
              type: 'RECEIVING_CHAIN',
              status: 'FAILED',
              txLink: 'https://example.com/tx/failed',
              error: { message: 'temporary' },
            },
          ],
        },
      },
    ],
  } as unknown as NonNullable<LifiMergedTransaction['lifiRoute']>;

  it('keeps the route data LiFi needs to resume but drops regenerated payloads', () => {
    const sanitizedRoute = sanitizeLifiRouteForStorage(route);

    expect(sanitizedRoute?.steps[0]).not.toHaveProperty('transactionRequest');
    expect(sanitizedRoute?.steps[0]?.action).toEqual(route.steps[0]?.action);
    expect(sanitizedRoute?.steps[0]?.estimate).toEqual(route.steps[0]?.estimate);
    expect(sanitizedRoute?.steps[0]?.execution?.process).toEqual([
      { type: 'TOKEN_ALLOWANCE', status: 'DONE' },
      {
        type: 'CROSS_CHAIN',
        status: 'DONE',
        txHash: '0xsource',
        txLink: 'https://example.com/tx/source',
      },
    ]);
  });

  it('replaces a terminal route with display-only snapshot and step data', () => {
    const transaction = {
      ...createMockedLifiTransaction({
        hash: '0xsource',
        sender: walletAddress,
        destinationAddress: walletAddress,
      }),
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.CONFIRMED,
      lifiRoute: route,
    };

    const compactedTransaction = prepareLifiTransactionForStorage(transaction);

    expect(compactedTransaction).not.toHaveProperty('lifiRoute');
    expect(compactedTransaction).toMatchObject({
      durationMs: 10_000,
      fromAmount: { amount: '10' },
      toAmount: { amount: '9' },
      toolsDetails: [{ key: 'relay', name: 'Relay' }],
      lifiRouteSteps: [
        {
          id: 'step-id',
          fromChainId: 42161,
          display: {
            toolDetails: { key: 'relay', name: 'Relay' },
            toAmount: {
              amount: '9',
              amountUSD: '9',
              chainId: 1,
              token: {
                address: constants.AddressZero,
                decimals: 18,
                symbol: 'ETH',
              },
            },
          },
          execution: {
            status: 'DONE',
            process: [
              { type: 'TOKEN_ALLOWANCE', status: 'DONE' },
              {
                type: 'CROSS_CHAIN',
                status: 'DONE',
                txHash: '0xsource',
                txLink: 'https://example.com/tx/source',
              },
              {
                type: 'RECEIVING_CHAIN',
                status: 'FAILED',
                txLink: 'https://example.com/tx/failed',
              },
            ],
          },
        },
      ],
    });
  });

  it('retains the sanitized route when a transaction fails so it can be retried', () => {
    const transaction = {
      ...createMockedLifiTransaction({
        hash: '0xsource',
        sender: walletAddress,
        destinationAddress: walletAddress,
      }),
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.FAILURE,
      lifiRoute: route,
    };

    const storedTransaction = prepareLifiTransactionForStorage(transaction);

    expect(storedTransaction.lifiRoute).toBeDefined();
    expect(storedTransaction.lifiRoute?.steps[0]).not.toHaveProperty('transactionRequest');
    expect(storedTransaction.lifiRouteSteps).toBeDefined();
  });

  it('retains the sanitized route when an unfinished transaction is settled', () => {
    const unfinishedRoute = {
      ...route,
      steps: [
        ...route.steps,
        {
          ...route.steps[0],
          id: 'destination-swap-step',
          execution: undefined,
        },
      ],
    } as NonNullable<LifiMergedTransaction['lifiRoute']>;
    const transaction = {
      ...createMockedLifiTransaction({
        hash: '0xsource',
        sender: walletAddress,
        destinationAddress: walletAddress,
      }),
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.CONFIRMED,
      lifiRoute: unfinishedRoute,
    };

    const storedTransaction = prepareLifiTransactionForStorage(transaction);

    expect(storedTransaction.lifiRoute?.steps).toHaveLength(2);
    expect(storedTransaction.lifiRoute?.steps[0]).not.toHaveProperty('transactionRequest');
    expect(storedTransaction.lifiRouteSteps).toBeDefined();
  });

  it('stores pending history details before pruning the resumable route', () => {
    const transaction = {
      ...createMockedLifiTransaction({
        hash: '0xsource',
        sender: walletAddress,
        destinationAddress: walletAddress,
      }),
      lifiRoute: route,
    };

    const storedTransaction = prepareLifiTransactionForStorage(transaction);

    expect(storedTransaction.lifiRoute?.steps[0]?.execution?.process).toEqual([
      { type: 'TOKEN_ALLOWANCE', status: 'DONE' },
      {
        type: 'CROSS_CHAIN',
        status: 'DONE',
        txHash: '0xsource',
        txLink: 'https://example.com/tx/source',
      },
    ]);
    expect(storedTransaction.lifiRouteSteps?.[0]?.execution?.process).toEqual([
      { type: 'TOKEN_ALLOWANCE', status: 'DONE', txHash: undefined, txLink: undefined },
      {
        type: 'CROSS_CHAIN',
        status: 'DONE',
        txHash: '0xsource',
        txLink: 'https://example.com/tx/source',
      },
      {
        type: 'RECEIVING_CHAIN',
        status: 'FAILED',
        txHash: undefined,
        txLink: 'https://example.com/tx/failed',
      },
    ]);
  });
});
