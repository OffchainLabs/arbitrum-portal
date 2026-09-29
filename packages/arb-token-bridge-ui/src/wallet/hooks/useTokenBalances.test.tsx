import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { BalanceProvider } from '../balance/BalanceContext';
import { createBalanceService } from '../balance/createBalanceService';
import { useTokenBalances } from './useTokenBalances';

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
        useTokenBalances({
          chainId: 1,
          walletAddress: 'account',
          tokenAddresses: ['token'],
        }),
      { wrapper },
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.data).toEqual({ token: 0n });
    balance = 42n;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(result.current.data).toEqual({ token: 42n });
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
        useTokenBalances({
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
  it('shares one account cache across token consumers', async () => {
    const fetchBalance = vi.fn(async ({ tokenAddresses }: { tokenAddresses: string[] }) =>
      Object.fromEntries(tokenAddresses.map((address, index) => [address, BigInt(index + 1)])),
    );
    const service = createBalanceService(() => ({ fetchBalance }));
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <BalanceProvider service={service}>{children}</BalanceProvider>
      </SWRConfig>
    );
    const account = '0x52908400098527886E0F7030069857D2E4169EE7';
    const { result } = renderHook(
      () => ({
        first: useTokenBalances({
          chainId: ChainId.Ethereum,
          walletAddress: account,
          tokenAddresses: ['token-a'],
        }),
        second: useTokenBalances({
          chainId: ChainId.Ethereum,
          walletAddress: account.toLowerCase(),
          tokenAddresses: ['token-b'],
        }),
      }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.first.data).toEqual({ 'token-a': 1n, 'token-b': 2n });
      expect(result.current.second.data).toBe(result.current.first.data);
    });
    expect(fetchBalance).toHaveBeenLastCalledWith({
      chainId: ChainId.Ethereum,
      walletAddress: account.toLowerCase(),
      tokenAddresses: ['token-a', 'token-b'],
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
      useTokenBalances({
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
});
