import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { fetchBridgeTokenList } from '../../util/TokenListUtils';
import { useNetworks } from '../useNetworks';
import { useNetworksRelationship } from '../useNetworksRelationship';
import { useTokenListPriceUpdater } from '../useTokenListPriceUpdater';
import { useLifiTokenList, useTokenLists } from '../useTokenLists';

const { FETCH_DELAY_MS, tokenListFixture } = vi.hoisted(() => ({
  // Long enough that the initial useTokenLists fetch is still in flight when the price
  // updater mounts, which is the window the regression lived in.
  FETCH_DELAY_MS: 50,
  tokenListFixture: {
    name: 'Test list',
    timestamp: '2026-01-01T00:00:00.000Z',
    version: { major: 1, minor: 0, patch: 0 },
    tokens: [
      {
        chainId: 42161,
        address: '0x46850ad61c2b7d64d08c9c754f45254596696984',
        name: 'Test token',
        symbol: 'TEST',
        decimals: 18,
      },
    ],
  },
}));

vi.mock('../../util/TokenListUtils', async () => {
  const actual = await vi.importActual<typeof import('../../util/TokenListUtils')>(
    '../../util/TokenListUtils',
  );

  return {
    ...actual,
    // Single implementation rather than per-call mocking, since this package runs tests
    // concurrently and per-call mocks race across files.
    fetchBridgeTokenList: vi.fn(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, FETCH_DELAY_MS);
      });
      return { data: tokenListFixture };
    }),
  };
});

vi.mock('../useNetworks', () => ({ useNetworks: vi.fn() }));
vi.mock('../useNetworksRelationship', () => ({ useNetworksRelationship: vi.fn() }));

const addTokensFromList = vi.fn();
vi.mock('../../state', () => ({
  useAppState: () => ({
    app: {
      arbTokenBridge: { token: { addTokensFromList } },
      arbTokenBridgeLoaded: true,
    },
  }),
}));

// Ethereum to Arbitrum One, a pair that has a LiFi token list.
const parentChain = { id: ChainId.Ethereum };
const childChain = { id: ChainId.ArbitrumOne };

function wrapper({ children }: PropsWithChildren) {
  // Fresh cache per render, so one test cannot satisfy another from cache.
  return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

describe.sequential('useTokenListPriceUpdater', () => {
  beforeEach(() => {
    vi.mocked(useNetworks).mockReturnValue([
      { sourceChain: parentChain, destinationChain: childChain },
      vi.fn(),
    ] as unknown as ReturnType<typeof useNetworks>);

    vi.mocked(useNetworksRelationship).mockReturnValue({
      childChain,
      parentChain,
    } as unknown as ReturnType<typeof useNetworksRelationship>);

    vi.mocked(fetchBridgeTokenList).mockClear();
    addTokensFromList.mockClear();
  });

  it('does not discard the in-flight token list fetch it overlaps', async () => {
    const { result } = renderHook(
      () => {
        useTokenListPriceUpdater();
        return useTokenLists(childChain.id);
      },
      { wrapper },
    );

    // Before the fix the price updater called mutate() on the useTokenLists key while its
    // initial fetch was in flight. SWR discarded the response and, with revalidation
    // disabled, never retried, so data stayed undefined forever.
    await waitFor(
      () => {
        expect(result.current.data?.length).toBeGreaterThan(0);
      },
      { timeout: 3_000 },
    );

    expect(result.current.error).toBeUndefined();
  });

  it('fetches the LiFi list from the polling owner', async () => {
    renderHook(() => useTokenListPriceUpdater(), { wrapper });

    await waitFor(() => {
      expect(vi.mocked(fetchBridgeTokenList)).toHaveBeenCalled();
    });
  });

  it('does not fetch from passive subscribers', async () => {
    // Polling, focus and reconnect revalidation are per hook instance in SWR, and this hook
    // is read in ~18 places including once per virtualized token row. Only the owner fetches.
    renderHook(() => useLifiTokenList(), { wrapper });

    await new Promise((resolve) => {
      setTimeout(resolve, FETCH_DELAY_MS * 3);
    });

    expect(vi.mocked(fetchBridgeTokenList)).not.toHaveBeenCalled();
  });
});
