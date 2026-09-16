import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import bs58 from 'bs58';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTransactionHistoryAddressStore } from '../components/TransactionHistory/TransactionHistorySearchBar';
import { useTransactionHistoryChainFilterStore } from '../components/TransactionHistory/useTransactionHistoryChainFilterStore';
import { createMockLifiTransaction } from '../test-utils/lifi';
import { createWalletTestWrapper } from '../test-utils/wallet-test-wrapper';
import type { Address } from '../util/AddressUtils';
import { defaultWalletContextValue } from '../wallet/WalletContext';
import { useLifiMergedTransactionCacheStore } from './useLifiMergedTransactionCacheStore';
import { useTransactionHistory } from './useTransactionHistory';

vi.mock('wagmi', async (importActual) => ({
  ...(await importActual<typeof import('wagmi')>()),
  useConfig: () => ({}),
  useAccount: () => ({ connector: undefined }),
}));

const firstAddress = bs58.encode(new Uint8Array(32).fill(1));
const secondAddress = bs58.encode(new Uint8Array(32).fill(2));

function transactions(address: Address, count: number, createdAt: number) {
  return Array.from({ length: count }, (_, index) =>
    createMockLifiTransaction({
      sender: address,
      destination: address,
      txId: bs58.encode(new Uint8Array(64).fill(index + 1)),
      sourceChainId: 1151111081099710,
      destinationChainId: 42161,
      createdAt: createdAt - index,
    }),
  );
}

function wrapper(address: Address) {
  return createWalletTestWrapper({
    query: { sourceChain: 1, destinationChain: 42161 },
    wallets: {
      ...defaultWalletContextValue,
      solana: {
        ...defaultWalletContextValue.solana,
        isConnected: true,
        account: { ecosystem: 'solana', address, status: 'connected' },
      },
    },
  });
}

describe.sequential('history address switches', () => {
  afterEach(() => {
    cleanup();
    useTransactionHistoryChainFilterStore.setState({
      selection: null,
      selectionDefaultChainId: undefined,
    });
    vi.unstubAllGlobals();
    useTransactionHistoryAddressStore.getState().resetSearch();
    useLifiMergedTransactionCacheStore.setState({ transactions: {} });
  });

  it('loads Solana LiFi history without an EVM wallet and resumes pagination after a search switch', async () => {
    useTransactionHistoryChainFilterStore
      .getState()
      .setSelection({ chainIds: [1151111081099710], isTestnetMode: false });
    const old = transactions(firstAddress, 4, Date.now() - 40 * 24 * 60 * 60 * 1000);
    const recent = transactions(secondAddress, 4, Date.now());
    const fetchHistory = vi.fn(async (input: string) => {
      const url = new URL(input, 'http://localhost');
      expect(url.pathname).toBe('/api/crosschain-transfers/lifi/transactions');
      const data = url.searchParams.get('wallet') === firstAddress ? old : recent;
      return new Response(JSON.stringify({ data }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchHistory);
    const { result, rerender } = renderHook(
      ({ address }) => useTransactionHistory(address, { runFetcher: true }),
      { initialProps: { address: firstAddress }, wrapper: wrapper(firstAddress) },
    );

    await waitFor(() => expect(result.current.transactions).toHaveLength(3));
    await act(async () => {});
    expect(result.current.completed).toBe(false);
    expect(result.current.loading).toBe(false);

    rerender({ address: secondAddress });
    await waitFor(() => expect(result.current.transactions).toHaveLength(4));
    expect(result.current.transactions.every((tx) => tx.sender === secondAddress)).toBe(true);
    expect(result.current.completed).toBe(true);
    expect(fetchHistory).toHaveBeenCalledTimes(2);
  });

  it('ignores an older address response that arrives after the new search', async () => {
    useTransactionHistoryChainFilterStore
      .getState()
      .setSelection({ chainIds: [1151111081099710], isTestnetMode: false });
    let releaseFirst: (response: Response) => void = () => {
      throw new Error('Request not started');
    };
    const firstResponse = new Promise<Response>((resolve) => {
      releaseFirst = resolve;
    });
    const fetchHistory = vi.fn((input: string) => {
      const url = new URL(input, 'http://localhost');
      return url.searchParams.get('wallet') === firstAddress
        ? firstResponse
        : Promise.resolve(
            new Response(JSON.stringify({ data: transactions(secondAddress, 1, Date.now()) })),
          );
    });
    vi.stubGlobal('fetch', fetchHistory);
    const { result, rerender } = renderHook(
      ({ address }) => useTransactionHistory(address, { runFetcher: true }),
      { initialProps: { address: firstAddress }, wrapper: wrapper(firstAddress) },
    );
    await waitFor(() => expect(fetchHistory).toHaveBeenCalledTimes(1));
    rerender({ address: secondAddress });
    await waitFor(() => expect(result.current.transactions[0]?.sender).toBe(secondAddress));
    await act(async () => {
      releaseFirst(
        new Response(JSON.stringify({ data: transactions(firstAddress, 1, Date.now()) })),
      );
      await firstResponse;
    });
    expect(result.current.transactions.map((tx) => tx.sender)).toEqual([secondAddress]);
  });
});
