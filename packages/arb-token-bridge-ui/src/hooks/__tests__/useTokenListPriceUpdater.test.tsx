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

const { FETCH_DELAY_MS, buildTokenList } = vi.hoisted(() => ({
  // Long enough that the initial useTokenLists fetch is still in flight when the price
  // updater mounts, which is the window the regression lived in.
  FETCH_DELAY_MS: 50,
  buildTokenList: (symbol: string) => ({
    name: 'Test list',
    timestamp: '2026-01-01T00:00:00.000Z',
    version: { major: 1, minor: 0, patch: 0 },
    tokens: [
      {
        chainId: 42161,
        address: '0x46850ad61c2b7d64d08c9c754f45254596696984',
        name: 'Test token',
        symbol,
        decimals: 18,
      },
    ],
  }),
}));

vi.mock('../../util/TokenListUtils', async () => {
  const actual = await vi.importActual<typeof import('../../util/TokenListUtils')>(
    '../../util/TokenListUtils',
  );

  return {
    ...actual,
    // Keyed by argument rather than per call, since this package runs tests concurrently
    // and per-call mocks race.
    fetchBridgeTokenList: vi.fn(async (bridgeTokenList: { id: string }) => {
      await new Promise((resolve) => {
        setTimeout(resolve, FETCH_DELAY_MS);
      });
      return { data: buildTokenList(bridgeTokenList.id) };
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
        expect(result.current.data?.length).toBeGreaterThan(0);
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
          expect.objectContaining({ tokens: expect.any(Array) }),
          LIFI_TRANSFER_LIST_ID,
        );
      },
      { timeout: 3_000 },
    );
  });
});
