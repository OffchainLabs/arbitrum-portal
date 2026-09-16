import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';
import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { BalanceProvider } from '../balance/BalanceContext';
import { createBalanceService } from '../balance/createBalanceService';
import { useTokenBalances } from './useTokenBalances';

describe('useTokenBalances', () => {
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
    const account = '0x1111111111111111111111111111111111111111';
    const { result } = renderHook(
      () => ({
        first: useTokenBalances({
          chainId: ChainId.Ethereum,
          walletAddress: account,
          tokenAddresses: ['token-a'],
        }),
        second: useTokenBalances({
          chainId: ChainId.Ethereum,
          walletAddress: account,
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
      walletAddress: account,
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
