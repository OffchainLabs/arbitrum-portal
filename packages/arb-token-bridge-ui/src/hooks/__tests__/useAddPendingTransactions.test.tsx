import { act, renderHook } from '@testing-library/react';
import { BigNumber } from 'ethers';
import React, { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';
import { describe, expect, it } from 'vitest';

import {
  DepositStatus,
  LifiMergedTransaction,
  MergedTransaction,
  WithdrawalStatus,
} from '../../state/app/state';
import { ChainId } from '../../types/ChainId';
import { AssetType } from '../arbTokenBridge.types';
import { useAddPendingTransactions } from '../useTransactionHistory';

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

describe('useAddPendingTransactions', () => {
  it('adds a pending transaction to the cache', () => {
    const { result } = renderHook(() => useAddPendingTransactions(ADDRESS_A), { wrapper: Wrapper });

    expect(result.current.newTransactionsData).toBeUndefined();

    act(() => {
      result.current.addPendingTransaction(pendingWithdrawal);
    });

    expect(result.current.newTransactionsData).toEqual([pendingWithdrawal]);
  });

  it('shares pending transactions between checksummed and lowercase EVM addresses', () => {
    const checksummedAddress = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';
    const { result } = renderHook(
      () => ({
        writer: useAddPendingTransactions(checksummedAddress),
        reader: useAddPendingTransactions(checksummedAddress.toLowerCase()),
      }),
      { wrapper: Wrapper },
    );

    act(() => {
      result.current.writer.addPendingTransaction(pendingWithdrawal);
    });

    expect(result.current.reader.newTransactionsData).toEqual([pendingWithdrawal]);
  });

  it('records and updates a Solana transfer in the wallet cache', () => {
    const solanaAddress = 'So11111111111111111111111111111111111111112';
    const pendingTransfer: LifiMergedTransaction = {
      ...baseTx,
      sender: solanaAddress,
      asset: 'SOL',
      txId: 'solana-signature',
      direction: 'deposit',
      isWithdrawal: false,
      isLifi: true,
      parentChainId: ChainId.Solana,
      sourceChainId: ChainId.Solana,
      childChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.ArbitrumOne,
      depositStatus: DepositStatus.LIFI_DEFAULT_STATE,
      status: WithdrawalStatus.UNCONFIRMED,
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
      destinationTxId: null,
    };
    const { result } = renderHook(
      () => ({
        writer: useAddPendingTransactions(solanaAddress),
        reader: useAddPendingTransactions(solanaAddress),
        evm: useAddPendingTransactions(ADDRESS_A),
      }),
      { wrapper: Wrapper },
    );

    act(() => {
      result.current.writer.addPendingTransaction(pendingTransfer);
    });

    expect(result.current.reader.newTransactionsData).toEqual([pendingTransfer]);
    expect(result.current.evm.newTransactionsData).toBeUndefined();

    const completedTransfer: LifiMergedTransaction = {
      ...pendingTransfer,
      status: WithdrawalStatus.EXECUTED,
      destinationStatus: WithdrawalStatus.EXECUTED,
      destinationTxId: '0xcompleted',
    };
    act(() => {
      result.current.writer.updatePendingTransaction(completedTransfer);
    });

    expect(result.current.reader.newTransactionsData).toEqual([completedTransfer]);
    expect(result.current.evm.newTransactionsData).toBeUndefined();
  });

  it('does not add the same pending transaction twice', () => {
    const { result } = renderHook(() => useAddPendingTransactions(ADDRESS_A), { wrapper: Wrapper });

    act(() => {
      result.current.addPendingTransaction(pendingWithdrawal);
      result.current.addPendingTransaction(pendingWithdrawal);
    });

    expect(result.current.newTransactionsData).toEqual([pendingWithdrawal]);
  });

  it('ignores non-pending transactions', () => {
    const { result } = renderHook(() => useAddPendingTransactions(ADDRESS_A), { wrapper: Wrapper });

    act(() => {
      result.current.addPendingTransaction(settledDeposit);
    });

    expect(result.current.newTransactionsData).toBeUndefined();
  });

  it('prepends newer transactions (newest first)', () => {
    const { result } = renderHook(() => useAddPendingTransactions(ADDRESS_A), { wrapper: Wrapper });

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
        writer: useAddPendingTransactions(ADDRESS_A),
        reader: useAddPendingTransactions(ADDRESS_A),
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
        a: useAddPendingTransactions(ADDRESS_A),
        b: useAddPendingTransactions(ADDRESS_B),
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
    const { result } = renderHook(() => useAddPendingTransactions(undefined), { wrapper: Wrapper });

    expect(result.current.newTransactionsData).toBeUndefined();

    // addPendingTransaction is a no-op with no address (SWR key is null, mutate writes nowhere observable).
    act(() => {
      result.current.addPendingTransaction(pendingWithdrawal);
    });

    expect(result.current.newTransactionsData).toBeUndefined();
  });
});
