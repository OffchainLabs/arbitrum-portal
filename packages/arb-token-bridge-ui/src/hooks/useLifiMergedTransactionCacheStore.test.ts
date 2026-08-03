import { act, renderHook, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import { BigNumber, constants } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shallow } from 'zustand/shallow';

import { DepositStatus, LifiMergedTransaction, WithdrawalStatus } from '../state/app/state';
import { getLifiTransactionSnapshot } from '../util/LifiRouteUtils';
import { AssetType } from './arbTokenBridge.types';
import { useLifiMergedTransactionCacheStore } from './useLifiMergedTransactionCacheStore';

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
      amount: BigNumber.from(10),
      amountUSD: '10',
      token: {
        address: constants.AddressZero,
        decimals: 18,
        symbol: 'ETH',
      },
    },
    toAmount: {
      amount: BigNumber.from(9),
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

    expect(snapshot?.fromAmount.amount.toString()).toBe('10');
    expect(snapshot?.toAmount.amount.toString()).toBe('9');
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
