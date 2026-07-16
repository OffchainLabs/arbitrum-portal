import { useCallback, useEffect, useSyncExternalStore } from 'react';

import {
  TokenListWithId,
  fetchBridgeTokenList,
  getBridgeTokenListsForNetworks,
} from '../util/TokenListUtils';
import { isNetwork } from '../util/networks';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';

/**
 * Token lists are kept in a plain module-level store instead of SWR: the lists
 * are fetched once per chain pair and reading the store during render makes it
 * impossible for subscribers to miss the result, which happened with SWR when
 * components remounted while the fetch was in flight.
 */
const tokenListsCache = new Map<string, TokenListWithId[]>();
const tokenListsInFlight = new Map<string, Promise<void>>();
const tokenListsListeners = new Set<() => void>();

function notifyTokenListsListeners() {
  tokenListsListeners.forEach((listener) => listener());
}

function subscribeToTokenLists(listener: () => void) {
  tokenListsListeners.add(listener);
  return () => {
    tokenListsListeners.delete(listener);
  };
}

function fetchAndCacheTokenLists({
  cacheKey,
  forL2ChainId,
  parentChainId,
}: {
  cacheKey: string;
  forL2ChainId: number;
  parentChainId: number;
}): Promise<void> {
  const pending = tokenListsInFlight.get(cacheKey);
  if (pending) {
    return pending;
  }

  const promise = fetchTokenLists(forL2ChainId, parentChainId).then((tokenLists) => {
    tokenListsCache.set(cacheKey, tokenLists);
    tokenListsInFlight.delete(cacheKey);
    notifyTokenListsListeners();
  });

  tokenListsInFlight.set(cacheKey, promise);
  return promise;
}

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

export type UseTokenListsResult = {
  data: TokenListWithId[] | undefined;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (
    updater: (
      current: TokenListWithId[] | undefined,
    ) => Promise<TokenListWithId[] | undefined> | TokenListWithId[] | undefined,
  ) => Promise<void>;
};

export function useTokenLists(forL2ChainId: number): UseTokenListsResult {
  const [networks] = useNetworks();
  const { parentChain } = useNetworksRelationship(networks);
  const parentChainId = parentChain.id;
  const cacheKey = `${forL2ChainId}:${parentChainId}`;

  const data = useSyncExternalStore(
    subscribeToTokenLists,
    () => tokenListsCache.get(cacheKey),
    () => undefined,
  );

  useEffect(() => {
    if (!tokenListsCache.has(cacheKey)) {
      void fetchAndCacheTokenLists({ cacheKey, forL2ChainId, parentChainId });
    }
  }, [cacheKey, forL2ChainId, parentChainId]);

  const mutate = useCallback<UseTokenListsResult['mutate']>(
    async (updater) => {
      const updated = await updater(tokenListsCache.get(cacheKey));
      if (updated) {
        tokenListsCache.set(cacheKey, updated);
        notifyTokenListsListeners();
      }
    },
    [cacheKey],
  );

  return { data, isLoading: !data, isValidating: !data, mutate };
}
