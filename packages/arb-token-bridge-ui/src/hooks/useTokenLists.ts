import { TokenList } from '@uniswap/token-lists';
import useSWR, { SWRResponse } from 'swr';
import useSWRImmutable from 'swr/immutable';

import {
  TokenListWithId,
  fetchBridgeTokenList,
  getBridgeTokenListsForNetworks,
  getLifiTokenListForNetworks,
} from '../util/TokenListUtils';
import { isNetwork } from '../util/networks';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';

function fetchTokenLists(forL2ChainId: number, parentChainId: number): Promise<TokenListWithId[]> {
  return new Promise((resolve) => {
    const { isOrbitChain } = isNetwork(forL2ChainId);
    const requestListArray = getBridgeTokenListsForNetworks({
      childChainId: forL2ChainId,
      parentChainId,
    }).filter((bridgeTokenList) => {
      if (bridgeTokenList.isArbitrumTokenTokenList && isOrbitChain) {
        return false;
      }

      return true;
    });

    Promise.allSettled(
      requestListArray.map((bridgeTokenList) => fetchBridgeTokenList(bridgeTokenList)),
    ).then((responses) => {
      const tokenListsWithBridgeTokenListId = responses.reduce<TokenListWithId[]>(
        (acc, response, index) => {
          if (response.status !== 'fulfilled') {
            return acc;
          }

          const { data } = response.value;
          if (!data) {
            return acc;
          }

          const bridgeTokenListId = requestListArray[index]?.id;

          if (typeof bridgeTokenListId === 'undefined') {
            return acc;
          }

          acc.push({
            l2ChainId: String(forL2ChainId),
            bridgeTokenListId,
            ...data,
          });

          return acc;
        },
        [],
      );

      resolve(tokenListsWithBridgeTokenListId);
    });
  });
}

export function useTokenLists(forL2ChainId: number): SWRResponse<TokenListWithId[]> {
  const [networks] = useNetworks();
  const { parentChain } = useNetworksRelationship(networks);
  return useSWRImmutable(
    ['useTokenLists', forL2ChainId, parentChain.id],
    ([, _forL2ChainId, _parentChainId]) => fetchTokenLists(_forL2ChainId, _parentChainId),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000,
    },
  );
}

// The LiFi tokens API caches its response for 30 seconds, so poll just above that for fresh prices.
const LIFI_TOKEN_LIST_REFRESH_INTERVAL_MS = 31_000;

/**
 * Polls the LiFi token list on its own SWR key so `priceUSD` stays fresh.
 *
 * The key is deliberately separate from {@link useTokenLists}. Refreshing by calling `mutate` on the
 * `useTokenLists` key meant that whenever a refresh overlapped the initial fetch, SWR discarded the
 * in-flight response and left every consumer with no token data until a new subscriber mounted.
 */
export function useLifiTokenList(): SWRResponse<TokenList | undefined> {
  const [networks] = useNetworks();
  const { childChain, parentChain } = useNetworksRelationship(networks);

  return useSWR(
    [childChain.id, parentChain.id, 'useLifiTokenList'] as const,
    async ([_childChainId, _parentChainId]) => {
      const lifiTokenList = getLifiTokenListForNetworks({
        childChainId: _childChainId,
        parentChainId: _parentChainId,
      });

      if (!lifiTokenList) {
        return undefined;
      }

      const { data } = await fetchBridgeTokenList(lifiTokenList);
      return data;
    },
    {
      // `useTokenLists` already fetches this list, so only fetch here to pick up later price updates.
      revalidateOnMount: false,
      refreshInterval: LIFI_TOKEN_LIST_REFRESH_INTERVAL_MS,
    },
  );
}
