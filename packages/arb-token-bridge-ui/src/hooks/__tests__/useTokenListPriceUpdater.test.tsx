import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { LIFI_TRANSFER_LIST_ID, fetchBridgeTokenList } from '../../util/TokenListUtils';
import { useNetworks } from '../useNetworks';
import { useNetworksRelationship } from '../useNetworksRelationship';
import { useTokenListPriceUpdater } from '../useTokenListPriceUpdater';
import { useTokenLists } from '../useTokenLists';

const { FETCH_DELAY_MS, MOCK_BRIDGE_TOKEN_LISTS, MOCK_TOKEN_LISTS } = vi.hoisted(() => {
  const arbitrumTokenList = {
    name: 'Mock Arbitrum Token list',
    timestamp: '2026-01-01T00:00:00.000Z',
    version: { major: 1, minor: 0, patch: 0 },
    tokens: [
      {
        chainId: 42161,
        address: '0x912ce59144191c1204e64559fe8253a0e49e6548',
        name: 'Arbitrum',
        symbol: 'ARB',
        decimals: 18,
      },
    ],
  };

  const lifiTokenList = {
    name: 'Mock LiFi list',
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
  };

  return {
    // Long enough that the initial useTokenLists fetch is still in flight when the price
    // updater mounts, which is the window the regression lived in.
    FETCH_DELAY_MS: 50,
    // The bridge token lists every chain pair resolves to, so the assertions below don't
    // depend on the real list config.
    MOCK_BRIDGE_TOKEN_LISTS: [
      {
        id: 'mock-arbitrum-token-list',
        name: 'Mock Arbitrum Token list',
        originChainID: 0,
        url: 'https://example.com/arbitrum-token-list.json',
        isDefault: true,
        isArbitrumTokenTokenList: true,
        logoURI: '/images/lists/ArbitrumLogo.png',
      },
      {
        id: 'lifi-token-list',
        name: 'Mock LiFi list',
        originChainID: 0,
        url: 'https://example.com/lifi.json',
        isDefault: true,
        logoURI: '/images/lists/ArbitrumLogo.png',
      },
    ],
    MOCK_TOKEN_LISTS: {
      'mock-arbitrum-token-list': arbitrumTokenList,
      'lifi-token-list': lifiTokenList,
    } as Record<string, typeof arbitrumTokenList | undefined>,
  };
});

vi.mock('../../util/TokenListUtils', async () => {
  const actual = await vi.importActual<typeof import('../../util/TokenListUtils')>(
    '../../util/TokenListUtils',
  );

  return {
    ...actual,
    getBridgeTokenListsForNetworks: vi.fn(() => MOCK_BRIDGE_TOKEN_LISTS),
    getLifiTokenListForNetworks: vi.fn(() => MOCK_BRIDGE_TOKEN_LISTS[1]),
    // Keyed by argument rather than per call, since this package runs tests concurrently
    // and per-call mocks race.
    fetchBridgeTokenList: vi.fn(async (bridgeTokenList: { id: string }) => {
      await new Promise((resolve) => {
        setTimeout(resolve, FETCH_DELAY_MS);
      });
      return { data: MOCK_TOKEN_LISTS[bridgeTokenList.id] };
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

const parentChain = { id: ChainId.Ethereum };
const childChain = { id: ChainId.ArbitrumOne };
// Another child chain to switch to, which moves the mounted hooks onto a new useTokenLists key.
const otherChildChain = { id: ChainId.ApeChain };

// Mutable so a rerender can move the mounted hooks onto a different useTokenLists key.
let currentChildChain = childChain;

function wrapper({ children }: PropsWithChildren) {
  // Fresh cache per render, so one test cannot satisfy another from cache.
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
  );
}

describe.sequential('useTokenListPriceUpdater', () => {
  beforeEach(() => {
    currentChildChain = childChain;

    vi.mocked(useNetworks).mockImplementation(
      () =>
        [
          { sourceChain: parentChain, destinationChain: currentChildChain },
          vi.fn(),
        ] as unknown as ReturnType<typeof useNetworks>,
    );

    vi.mocked(useNetworksRelationship).mockImplementation(
      () =>
        ({
          childChain: currentChildChain,
          parentChain,
        }) as unknown as ReturnType<typeof useNetworksRelationship>,
    );

    vi.mocked(fetchBridgeTokenList).mockClear();
    addTokensFromList.mockClear();
  });

  it('leaves the token lists intact when it mounts during their initial fetch', async () => {
    const { result } = renderHook(
      () => {
        useTokenListPriceUpdater();
        return useTokenLists(childChain.id);
      },
      { wrapper },
    );

    // The updater mutates the useTokenLists key. SWR discards any response that overlaps a
    // mutation on the same key, and useSWRImmutable has no revalidation left to recover
    // with, so refreshing during the initial fetch used to leave data undefined forever.
    await waitFor(
      () => {
        expect(result.current.data).toEqual([
          {
            l2ChainId: '42161',
            bridgeTokenListId: 'mock-arbitrum-token-list',
            name: 'Mock Arbitrum Token list',
            timestamp: '2026-01-01T00:00:00.000Z',
            version: { major: 1, minor: 0, patch: 0 },
            tokens: [
              {
                chainId: 42161,
                address: '0x912ce59144191c1204e64559fe8253a0e49e6548',
                name: 'Arbitrum',
                symbol: 'ARB',
                decimals: 18,
              },
            ],
          },
          {
            l2ChainId: '42161',
            bridgeTokenListId: 'lifi-token-list',
            name: 'Mock LiFi list',
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
        ]);
      },
      { timeout: 3_000 },
    );

    expect(result.current.error).toBeUndefined();
  });

  it('still refreshes the LiFi list once the token lists have loaded', async () => {
    renderHook(
      () => {
        useTokenListPriceUpdater();
        return useTokenLists(childChain.id);
      },
      { wrapper },
    );

    await waitFor(
      () => {
        expect(addTokensFromList).toHaveBeenCalledWith(
          {
            name: 'Mock LiFi list',
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
          LIFI_TRANSFER_LIST_ID,
        );
      },
      { timeout: 3_000 },
    );
  });

  it('loads the new token lists when the chain pair changes', async () => {
    const { result, rerender } = renderHook(
      () => {
        useTokenListPriceUpdater();
        return useTokenLists(currentChildChain.id);
      },
      { wrapper },
    );

    await waitFor(
      () => {
        expect(result.current.data).toEqual([
          {
            l2ChainId: '42161',
            bridgeTokenListId: 'mock-arbitrum-token-list',
            name: 'Mock Arbitrum Token list',
            timestamp: '2026-01-01T00:00:00.000Z',
            version: { major: 1, minor: 0, patch: 0 },
            tokens: [
              {
                chainId: 42161,
                address: '0x912ce59144191c1204e64559fe8253a0e49e6548',
                name: 'Arbitrum',
                symbol: 'ARB',
                decimals: 18,
              },
            ],
          },
          {
            l2ChainId: '42161',
            bridgeTokenListId: 'lifi-token-list',
            name: 'Mock LiFi list',
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
        ]);
      },
      { timeout: 3_000 },
    );

    // Switching chains moves an already-mounted useTokenLists onto a brand new key, with an
    // empty cache entry and its own fetch in flight. That is the same window as the initial
    // mount, so the updater must not mutate until the new key has its own data. Note that
    // `isLoading` is not a usable guard here: SWR only reports it from a cached entry or, as
    // a fallback, from a first-render flag that is already spent by this point.
    currentChildChain = otherChildChain;
    rerender();

    // Exact match on `l2ChainId`, so returning the previous chain's lists (for example via
    // `keepPreviousData`) fails here rather than looking correct.
    await waitFor(
      () => {
        expect(result.current.data).toEqual([
          {
            l2ChainId: '33139',
            bridgeTokenListId: 'mock-arbitrum-token-list',
            name: 'Mock Arbitrum Token list',
            timestamp: '2026-01-01T00:00:00.000Z',
            version: { major: 1, minor: 0, patch: 0 },
            tokens: [
              {
                chainId: 42161,
                address: '0x912ce59144191c1204e64559fe8253a0e49e6548',
                name: 'Arbitrum',
                symbol: 'ARB',
                decimals: 18,
              },
            ],
          },
          {
            l2ChainId: '33139',
            bridgeTokenListId: 'lifi-token-list',
            name: 'Mock LiFi list',
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
        ]);
      },
      { timeout: 3_000 },
    );
  });
});
