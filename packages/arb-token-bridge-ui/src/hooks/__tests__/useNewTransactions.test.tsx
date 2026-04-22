import { act, renderHook } from '@testing-library/react';
import { BigNumber } from 'ethers';
import React, { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';
import { describe, expect, it } from 'vitest';

import { DepositStatus, MergedTransaction, WithdrawalStatus } from '../../state/app/state';
import { AssetType } from '../arbTokenBridge.types';
import { useNewTransactions } from '../useTransactionHistory';

// Each test gets its own SWR cache to avoid cross-test bleed.
const Wrapper = ({ children }: PropsWithChildren<unknown>) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

const baseTx = {
  asset: 'ETH',
  assetType: AssetType.ETH,
  blockNum: null,
  createdAt: 1_700_000_000_000,
  resolvedAt: null,
  uniqueId: null as BigNumber | null,
  value: '1',
  tokenAddress: null,
  parentChainId: 1,
  childChainId: 42161,
  sourceChainId: 42161,
  destinationChainId: 1,
  sender: '0x1111111111111111111111111111111111111111',
  destination: '0x1111111111111111111111111111111111111111',
};

const pendingWithdrawal: MergedTransaction = {
  ...baseTx,
  txId: '0xpending-1',
  direction: 'withdraw',
  status: WithdrawalStatus.UNCONFIRMED,
  isWithdrawal: true,
};

const pendingWithdrawal2: MergedTransaction = {
  ...baseTx,
  txId: '0xpending-2',
  direction: 'withdraw',
  status: WithdrawalStatus.UNCONFIRMED,
  isWithdrawal: true,
};

const settledDeposit: MergedTransaction = {
  ...baseTx,
  txId: '0xsettled-1',
  direction: 'deposit',
  status: 'success',
  isWithdrawal: false,
  depositStatus: DepositStatus.L2_SUCCESS,
};

const ADDRESS_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const ADDRESS_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

describe('useNewTransactions', () => {
  it('adds a pending transaction to the cache', () => {
    const { result } = renderHook(() => useNewTransactions(ADDRESS_A), { wrapper: Wrapper });

    expect(result.current.newTransactionsData).toBeUndefined();

    act(() => {
      result.current.addPendingTransaction(pendingWithdrawal);
    });

    expect(result.current.newTransactionsData).toEqual([pendingWithdrawal]);
  });

  it('ignores non-pending transactions', () => {
    const { result } = renderHook(() => useNewTransactions(ADDRESS_A), { wrapper: Wrapper });

    act(() => {
      result.current.addPendingTransaction(settledDeposit);
    });

    expect(result.current.newTransactionsData).toBeUndefined();
  });

  it('prepends newer transactions (newest first)', () => {
    const { result } = renderHook(() => useNewTransactions(ADDRESS_A), { wrapper: Wrapper });

    act(() => {
      result.current.addPendingTransaction(pendingWithdrawal);
    });
    act(() => {
      result.current.addPendingTransaction(pendingWithdrawal2);
    });

    expect(result.current.newTransactionsData).toEqual([pendingWithdrawal2, pendingWithdrawal]);
  });

  it('shares the cache between instances with the same address', () => {
    // Both hooks must sit under the same SWRConfig provider to share the cache.
    const { result } = renderHook(
      () => ({
        writer: useNewTransactions(ADDRESS_A),
        reader: useNewTransactions(ADDRESS_A),
      }),
      { wrapper: Wrapper },
    );

    act(() => {
      result.current.writer.addPendingTransaction(pendingWithdrawal);
    });

    expect(result.current.reader.newTransactionsData).toEqual([pendingWithdrawal]);
  });

  it('isolates caches across different addresses', () => {
    const { result } = renderHook(
      () => ({
        a: useNewTransactions(ADDRESS_A),
        b: useNewTransactions(ADDRESS_B),
      }),
      { wrapper: Wrapper },
    );

    act(() => {
      result.current.a.addPendingTransaction(pendingWithdrawal);
    });

    expect(result.current.a.newTransactionsData).toEqual([pendingWithdrawal]);
    expect(result.current.b.newTransactionsData).toBeUndefined();
  });

  it('returns undefined cache when address is undefined', () => {
    const { result } = renderHook(() => useNewTransactions(undefined), { wrapper: Wrapper });

    expect(result.current.newTransactionsData).toBeUndefined();

    // addPendingTransaction is a no-op with no address (SWR key is null, mutate writes nowhere observable).
    act(() => {
      result.current.addPendingTransaction(pendingWithdrawal);
    });

    expect(result.current.newTransactionsData).toBeUndefined();
  });
});
