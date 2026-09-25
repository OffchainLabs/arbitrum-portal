import { act, renderHook, waitFor } from '@testing-library/react';
import type { TokenList } from '@uniswap/token-lists';
import type { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import {
  LIFI_TRANSFER_LIST_ID,
  fetchBridgeTokenList,
  getBridgeTokenListsForNetworks,
} from '../../util/TokenListUtils';
import { useTokenLists } from '../useTokenLists';

vi.mock('../../util/TokenListUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../util/TokenListUtils')>();

  return {
    ...actual,
    fetchBridgeTokenList: vi.fn(),
    getBridgeTokenListsForNetworks: vi.fn(),
  };
});

vi.mock('../useNetworks', () => ({ useNetworks: () => [{}] }));
vi.mock('../useNetworksRelationship', () => ({
  useNetworksRelationship: () => ({ parentChain: { id: ChainId.ArbitrumOne } }),
}));

const lifiTokenList: TokenList = {
  name: 'LiFi Transfer Tokens',
  timestamp: '2026-01-01T00:00:00.000Z',
  version: { major: 1, minor: 0, patch: 0 },
  tokens: [
    {
      chainId: ChainId.RobinhoodChain,
      address: CommonAddress.RobinhoodChain.USDG,
      decimals: 6,
      name: 'Global Dollar',
      symbol: 'USDG',
    },
  ],
};

const otherTokenList: TokenList = {
  ...lifiTokenList,
  name: 'Other tokens',
  tokens: [],
};

function wrapper({ children }: PropsWithChildren) {
  return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

describe.sequential('useTokenLists', () => {
  beforeEach(() => {
    vi.mocked(fetchBridgeTokenList).mockReset();
    vi.mocked(getBridgeTokenListsForNetworks).mockReturnValue(
      [LIFI_TRANSFER_LIST_ID, 'other-list'].map((id) => ({
        id,
        name: id,
        originChainID: ChainId.RobinhoodChain,
        isDefault: true,
        logoURI: '',
        url: `/api/${id}`,
      })),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(['missing data', 'rejected request'] as const)(
    'recovers USDG after a transient LiFi failure (%s)',
    async (failureType) => {
      let lifiRequestCount = 0;

      vi.mocked(fetchBridgeTokenList).mockImplementation(async ({ id }) => {
        if (id !== LIFI_TRANSFER_LIST_ID) {
          return { data: otherTokenList };
        }

        lifiRequestCount += 1;

        if (lifiRequestCount === 1) {
          if (failureType === 'rejected request') {
            throw new Error('Temporary failure');
          }

          return { data: undefined };
        }

        return { data: lifiTokenList };
      });

      const { result } = renderHook(() => useTokenLists(ChainId.RobinhoodChain), { wrapper });

      await waitFor(
        () => {
          expect(result.current.data).toEqual([
            {
              ...lifiTokenList,
              l2ChainId: String(ChainId.RobinhoodChain),
              bridgeTokenListId: LIFI_TRANSFER_LIST_ID,
            },
            {
              ...otherTokenList,
              l2ChainId: String(ChainId.RobinhoodChain),
              bridgeTokenListId: 'other-list',
            },
          ]);
        },
        { timeout: 3_000 },
      );

      expect(lifiRequestCount).toBe(2);
      expect(fetchBridgeTokenList).toHaveBeenCalledTimes(3);
    },
  );

  it('keeps successful lists after exhausting retries for a failed list', async () => {
    vi.useFakeTimers();
    let lifiRequestCount = 0;

    vi.mocked(fetchBridgeTokenList).mockImplementation(async ({ id }) => {
      if (id !== LIFI_TRANSFER_LIST_ID) {
        return { data: otherTokenList };
      }

      lifiRequestCount += 1;
      return { data: undefined };
    });

    const { result } = renderHook(() => useTokenLists(ChainId.RobinhoodChain), { wrapper });
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual([
      {
        ...otherTokenList,
        l2ChainId: String(ChainId.RobinhoodChain),
        bridgeTokenListId: 'other-list',
      },
    ]);
    expect(lifiRequestCount).toBe(3);
    expect(fetchBridgeTokenList).toHaveBeenCalledTimes(4);
  });

  it('accepts a successfully loaded empty token list without retrying', async () => {
    vi.mocked(fetchBridgeTokenList).mockResolvedValue({ data: otherTokenList });

    const { result } = renderHook(() => useTokenLists(ChainId.RobinhoodChain), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(fetchBridgeTokenList).toHaveBeenCalledTimes(2);
  });
});
