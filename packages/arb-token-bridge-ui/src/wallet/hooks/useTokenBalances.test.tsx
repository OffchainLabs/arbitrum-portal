import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { BalanceProvider } from '../balance/BalanceContext';
import { createBalanceService } from '../balance/createBalanceService';
import { useRefreshTokenBalances, useTokenBalances } from './useTokenBalances';

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
    const service = createBalanceService(() => ({
      fetchBalance: async () => ({ token: balance }),
    }));
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <BalanceProvider service={service}>{children}</BalanceProvider>
      </SWRConfig>
    );
    const { result } = renderHook(
      () =>
        useObservedTokenBalances({
          chainId: 1,
          walletAddress: 'account',
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
    const service = createBalanceService(() => ({ fetchBalance }));
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <BalanceProvider service={service}>{children}</BalanceProvider>
      </SWRConfig>
    );
    const { result } = renderHook(
      () =>
        useObservedTokenBalances({
          chainId: 1,
          walletAddress: 'account',
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

  it('does not retain another account balance during loading, RPC failure, or disconnect', async () => {
    const fetchBalance = vi.fn(async ({ walletAddress }: { walletAddress: string }) => {
      if (walletAddress === 'second') throw new Error('RPC unavailable');
      return { token: 7n };
    });
    const service = createBalanceService(() => ({ fetchBalance }));
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
        <BalanceProvider service={service}>{children}</BalanceProvider>
      </SWRConfig>
    );
    const initialProps: { walletAddress?: string } = { walletAddress: 'first' };
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
    rerender({ walletAddress: 'second' });
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
    const service = createBalanceService(() => ({ fetchBalance }));
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => new Map() }}>
        <BalanceProvider service={service}>{children}</BalanceProvider>
      </SWRConfig>
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

  it('keeps caches from different balance providers separate', async () => {
    const cache = new Map();
    const account = '0x1111111111111111111111111111111111111111';
    const firstFetch = vi.fn().mockResolvedValue({ token: 10n });
    const secondFetch = vi.fn().mockResolvedValue({ token: 99n });
    const firstService = createBalanceService(() => ({ fetchBalance: firstFetch }));
    const secondService = createBalanceService(() => ({ fetchBalance: secondFetch }));
    const createWrapper = (service: ReturnType<typeof createBalanceService>) =>
      function Wrapper({ children }: PropsWithChildren) {
        return (
          <SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>
            <BalanceProvider service={service}>{children}</BalanceProvider>
          </SWRConfig>
        );
      };
    const useBalance = () =>
      useObservedTokenBalances({
        chainId: ChainId.Ethereum,
        walletAddress: account,
        tokenAddresses: ['token'],
      });
    const first = renderHook(useBalance, { wrapper: createWrapper(firstService) });

    await waitFor(() => expect(first.result.current.data).toEqual({ token: 10n }));

    const second = renderHook(useBalance, { wrapper: createWrapper(secondService) });

    await waitFor(() => expect(second.result.current.data).toEqual({ token: 99n }));
    expect(firstFetch).toHaveBeenCalled();
    expect(secondFetch).toHaveBeenCalled();
  });

  it('uses local mutate and follows changed token lists without a subscription', async () => {
    let amount = 1n;
    const fetchBalance = vi.fn(async ({ tokenAddresses }: { tokenAddresses: string[] }) =>
      Object.fromEntries(tokenAddresses.map((token) => [token, amount])),
    );
    const service = createBalanceService(() => ({ fetchBalance }));
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => new Map() }}>
        <BalanceProvider service={service}>{children}</BalanceProvider>
      </SWRConfig>
    );
    const { result, rerender } = renderHook(
      ({ tokens }) =>
        useObservedTokenBalances({
          chainId: 1,
          walletAddress: 'account',
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

  it('refreshes every matching subset without refreshing other accounts, chains or services', async () => {
    let amount = 1n;
    const fetchBalance = vi.fn(async ({ tokenAddresses }: { tokenAddresses: string[] }) =>
      Object.fromEntries(tokenAddresses.map((token) => [token, amount])),
    );
    const otherFetch = vi.fn().mockResolvedValue({ first: 9n });
    const service = createBalanceService(() => ({ fetchBalance }));
    const otherService = createBalanceService(() => ({ fetchBalance: otherFetch }));
    const cache = new Map();
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => cache }}>
        <BalanceProvider service={service}>{children}</BalanceProvider>
      </SWRConfig>
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
          walletAddress: 'other',
          tokenAddresses: ['first'],
        }),
        otherChain: useObservedTokenBalances({
          chainId: 2,
          walletAddress: account,
          tokenAddresses: ['first'],
        }),
        refresh: useRefreshTokenBalances(),
      }),
      { wrapper },
    );
    const other = renderHook(
      () =>
        useObservedTokenBalances({ chainId: 1, walletAddress: account, tokenAddresses: ['first'] }),
      {
        wrapper: ({ children }: PropsWithChildren) => (
          <SWRConfig value={{ provider: () => cache }}>
            <BalanceProvider service={otherService}>{children}</BalanceProvider>
          </SWRConfig>
        ),
      },
    );
    await waitFor(() => {
      expect(result.current.first.data).toEqual({ first: 1n });
      expect(result.current.second.data).toEqual({ second: 1n });
      expect(result.current.otherAccount.data).toEqual({ first: 1n });
      expect(result.current.otherChain.data).toEqual({ first: 1n });
      expect(other.result.current.data).toEqual({ first: 9n });
    });
    fetchBalance.mockClear();
    otherFetch.mockClear();
    amount = 2n;
    await act(async () => {
      await result.current.refresh({ chainId: 1, walletAddress: account });
    });
    expect(result.current.first.data).toEqual({ first: 2n });
    expect(result.current.second.data).toEqual({ second: 2n });
    expect(result.current.otherAccount.data).toEqual({ first: 1n });
    expect(result.current.otherChain.data).toEqual({ first: 1n });
    expect(fetchBalance).toHaveBeenCalledTimes(2);
    expect(otherFetch).not.toHaveBeenCalled();
  });
});
