import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { getBalanceClient } from '../balance/getBalanceClient';
import { useRefreshTokenBalances, useTokenBalances } from './useTokenBalances';

vi.mock('../balance/getBalanceClient', () => ({ getBalanceClient: vi.fn() }));

const ACCOUNT_ADDRESS = '0x1111111111111111111111111111111111111111';
const FIRST_ADDRESS = '0x2222222222222222222222222222222222222222';
const SECOND_ADDRESS = '0x3333333333333333333333333333333333333333';
const OTHER_ADDRESS = '0x4444444444444444444444444444444444444444';

function useObservedTokenBalances(input: Parameters<typeof useTokenBalances>[0]) {
  return { ...useTokenBalances(input) };
}

describe.sequential('useTokenBalances', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('refreshes selected token holdings without changing selection', async () => {
    vi.useFakeTimers();
    let balance = 0n;
    vi.mocked(getBalanceClient).mockReturnValue({
      fetchBalance: async () => ({ token: balance }),
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
    );
    const { result } = renderHook(
      () =>
        useObservedTokenBalances({
          chainId: 1,
          walletAddress: ACCOUNT_ADDRESS,
          tokenAddresses: ['token'],
        }),
      { wrapper },
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20);
    });
    expect(result.current.data).toEqual({ token: 0n });
    balance = 42n;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(result.current.data).toEqual({ token: 42n });
  });

  it('does not poll token-list requests when periodic refresh is disabled', async () => {
    vi.useFakeTimers();
    const fetchBalance = vi.fn(async () => ({ token: 7n }));
    vi.mocked(getBalanceClient).mockReturnValue({ fetchBalance });
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
    );
    const { result } = renderHook(
      () =>
        useObservedTokenBalances({
          chainId: 1,
          walletAddress: ACCOUNT_ADDRESS,
          tokenAddresses: ['token'],
          refreshInterval: 0,
        }),
      { wrapper },
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20);
    });
    expect(result.current.data).toEqual({ token: 7n });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(fetchBalance).toHaveBeenCalledTimes(1);
  });

  it('revalidates cached balances when a consumer without polling mounts again', async () => {
    let balance = 1n;
    vi.mocked(getBalanceClient).mockReturnValue({ fetchBalance: async () => ({ token: balance }) });
    const cache = new Map();
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>{children}</SWRConfig>
    );
    const input = {
      chainId: 1,
      walletAddress: ACCOUNT_ADDRESS,
      tokenAddresses: ['token'],
      refreshInterval: 0,
    };
    const first = renderHook(() => useObservedTokenBalances(input), { wrapper });
    await waitFor(() => expect(first.result.current.data).toEqual({ token: 1n }));
    first.unmount();
    balance = 2n;
    const second = renderHook(() => useObservedTokenBalances(input), { wrapper });
    await waitFor(() => expect(second.result.current.data).toEqual({ token: 2n }));
  });

  it('keeps previous balances while a changed token list loads, but not after disconnect', async () => {
    vi.mocked(getBalanceClient).mockReturnValue({
      fetchBalance: async ({ tokenAddresses }) =>
        Object.fromEntries(tokenAddresses.map((token) => [token, 1n])),
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
    );
    const initialProps: { walletAddress?: string; tokens: string[] } = {
      walletAddress: ACCOUNT_ADDRESS,
      tokens: ['first'],
    };
    const { result, rerender } = renderHook(
      ({ walletAddress, tokens }) =>
        useObservedTokenBalances({
          chainId: 1,
          walletAddress,
          tokenAddresses: tokens,
          keepPreviousData: true,
        }),
      { wrapper, initialProps },
    );
    await waitFor(() => expect(result.current.data).toEqual({ first: 1n }));
    rerender({ walletAddress: ACCOUNT_ADDRESS, tokens: ['first', 'second'] });
    expect(result.current.data).toEqual({ first: 1n });
    await waitFor(() => expect(result.current.data).toEqual({ first: 1n, second: 1n }));
    rerender({ walletAddress: undefined, tokens: ['first', 'second'] });
    expect(result.current.data).toBeUndefined();
  });

  it('does not retain another account balance during loading, RPC failure, or disconnect', async () => {
    const fetchBalance = vi.fn(async ({ walletAddress }: { walletAddress: string }) => {
      if (walletAddress === SECOND_ADDRESS) throw new Error('RPC unavailable');
      return { token: 7n };
    });
    vi.mocked(getBalanceClient).mockReturnValue({ fetchBalance });
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
        {children}
      </SWRConfig>
    );
    const initialProps: { walletAddress?: string } = { walletAddress: FIRST_ADDRESS };
    const { result, rerender } = renderHook(
      ({ walletAddress }: { walletAddress?: string }) =>
        useObservedTokenBalances({
          chainId: 1,
          walletAddress,
          tokenAddresses: ['token'],
        }),
      { wrapper, initialProps },
    );
    await waitFor(() => expect(result.current.data).toEqual({ token: 7n }));
    rerender({ walletAddress: SECOND_ADDRESS });
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.error?.message).toBe('RPC unavailable'));
    expect(result.current.data).toBeUndefined();
    rerender({ walletAddress: undefined });
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });
  it('shares identical requests across token consumers', async () => {
    const fetchBalance = vi.fn(async ({ tokenAddresses }: { tokenAddresses: string[] }) =>
      Object.fromEntries(tokenAddresses.map((address, index) => [address, BigInt(index + 1)])),
    );
    vi.mocked(getBalanceClient).mockReturnValue({ fetchBalance });
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
    );
    const account = '0x52908400098527886E0F7030069857D2E4169EE7';
    const { result } = renderHook(
      () => ({
        first: useObservedTokenBalances({
          chainId: ChainId.Ethereum,
          walletAddress: account,
          tokenAddresses: ['token-a'],
        }),
        second: useObservedTokenBalances({
          chainId: ChainId.Ethereum,
          walletAddress: account,
          tokenAddresses: ['token-a'],
        }),
      }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.first.data).toEqual({ 'token-a': 1n });
      expect(result.current.second.data).toBe(result.current.first.data);
    });
    expect(fetchBalance).toHaveBeenCalledTimes(1);
    expect(fetchBalance).toHaveBeenLastCalledWith({
      chainId: ChainId.Ethereum,
      walletAddress: account,
      tokenAddresses: ['token-a'],
    });
  });

  it('uses local mutate and follows changed token lists without a subscription', async () => {
    let amount = 1n;
    const fetchBalance = vi.fn(async ({ tokenAddresses }: { tokenAddresses: string[] }) =>
      Object.fromEntries(tokenAddresses.map((token) => [token, amount])),
    );
    vi.mocked(getBalanceClient).mockReturnValue({ fetchBalance });
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
    );
    const { result, rerender } = renderHook(
      ({ tokens }) =>
        useObservedTokenBalances({
          chainId: 1,
          walletAddress: ACCOUNT_ADDRESS,
          tokenAddresses: tokens,
        }),
      { wrapper, initialProps: { tokens: ['first'] } },
    );
    await waitFor(() => expect(result.current.data).toEqual({ first: 1n }));
    amount = 2n;
    await act(async () => {
      await result.current.mutate();
    });
    expect(result.current.data).toEqual({ first: 2n });
    rerender({ tokens: ['second'] });
    await waitFor(() => expect(result.current.data).toEqual({ second: 2n }));
    rerender({ tokens: [] });
    expect(result.current.data).toBeUndefined();
    expect(fetchBalance).toHaveBeenCalledTimes(3);
  });

  it('refreshes every matching subset without refreshing other accounts or chains', async () => {
    let amount = 1n;
    const fetchBalance = vi.fn(async ({ tokenAddresses }: { tokenAddresses: string[] }) =>
      Object.fromEntries(tokenAddresses.map((token) => [token, amount])),
    );
    vi.mocked(getBalanceClient).mockReturnValue({ fetchBalance });
    const cache = new Map();
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => cache }}>{children}</SWRConfig>
    );
    const account = '0x52908400098527886E0F7030069857D2E4169EE7';
    const { result } = renderHook(
      () => ({
        first: useObservedTokenBalances({
          chainId: 1,
          walletAddress: account,
          tokenAddresses: ['first'],
        }),
        second: useObservedTokenBalances({
          chainId: 1,
          walletAddress: account,
          tokenAddresses: ['second'],
        }),
        otherAccount: useObservedTokenBalances({
          chainId: 1,
          walletAddress: OTHER_ADDRESS,
          tokenAddresses: ['first'],
        }),
        otherChain: useObservedTokenBalances({
          chainId: ChainId.ArbitrumOne,
          walletAddress: account,
          tokenAddresses: ['first'],
        }),
        refresh: useRefreshTokenBalances(),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.first.data).toEqual({ first: 1n });
      expect(result.current.second.data).toEqual({ second: 1n });
      expect(result.current.otherAccount.data).toEqual({ first: 1n });
      expect(result.current.otherChain.data).toEqual({ first: 1n });
    });
    fetchBalance.mockClear();
    amount = 2n;
    await act(async () => {
      await result.current.refresh({ chainId: 1, walletAddress: account });
    });
    expect(result.current.first.data).toEqual({ first: 2n });
    expect(result.current.second.data).toEqual({ second: 2n });
    expect(result.current.otherAccount.data).toEqual({ first: 1n });
    expect(result.current.otherChain.data).toEqual({ first: 1n });
    expect(fetchBalance).toHaveBeenCalledTimes(2);
  });

  it('does not fetch for an address that is invalid on the chain', () => {
    const fetchBalance = vi.fn(async () => ({ token: 1n }));
    vi.mocked(getBalanceClient).mockReturnValue({ fetchBalance });
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
    );
    const { result } = renderHook(
      () =>
        useObservedTokenBalances({
          chainId: ChainId.Ethereum,
          walletAddress: 'not-an-address',
          tokenAddresses: ['token'],
        }),
      { wrapper },
    );
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(fetchBalance).not.toHaveBeenCalled();
  });
});
