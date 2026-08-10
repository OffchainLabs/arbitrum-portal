import { useCallback, useEffect, useRef } from 'react';
import { useInterval } from 'react-use';

import { useAppState } from '../state';
import {
  LIFI_TRANSFER_LIST_ID,
  fetchBridgeTokenList,
  getLifiTokenListForNetworks,
} from '../util/TokenListUtils';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';
import { useTokenLists } from './useTokenLists';

const DEFAULT_REFRESH_INTERVAL_MS = 31_000; // API cache response for 30 seconds, we want to ensure we're getting fresh data

export function useTokenListPriceUpdater({
  intervalMs = DEFAULT_REFRESH_INTERVAL_MS,
}: { intervalMs?: number } = {}): void {
  const {
    app: { arbTokenBridge, arbTokenBridgeLoaded },
  } = useAppState();
  const [networks] = useNetworks();
  const { childChain, parentChain } = useNetworksRelationship(networks);
  const { data: tokenLists, mutate } = useTokenLists(childChain.id);
  const arbTokenBridgeRef = useRef(arbTokenBridge);

  /**
   * Deliberately a boolean rather than the list itself. Mutating writes a new array, so depending on
   * `tokenLists` here would give this callback a new identity on every refresh and the effect below
   * would re-trigger it in a loop.
   */
  const hasTokenLists = typeof tokenLists !== 'undefined';

  useEffect(() => {
    arbTokenBridgeRef.current = arbTokenBridge;
  }, [arbTokenBridge]);

  const refreshLifiTokenList = useCallback(() => {
    /**
     * Never mutate this key while its own fetch is in flight. SWR discards any response that
     * overlaps a mutation on the same key, and `useTokenLists` is `useSWRImmutable`, so there is no
     * revalidation left to recover the discarded token lists with: every consumer would be stuck
     * with no tokens until a new subscriber mounted.
     *
     * Data being present is a sufficient check only because `useTokenLists` never revalidates once
     * it has data. Revisit this if that changes.
     */
    if (!hasTokenLists) {
      return;
    }

    const lifiTokenList = getLifiTokenListForNetworks({
      childChainId: childChain.id,
      parentChainId: parentChain.id,
    });

    if (!lifiTokenList) {
      return;
    }

    mutate(async (current) => {
      if (!current) {
        return current;
      }

      const { data } = await fetchBridgeTokenList(lifiTokenList);
      if (!data) {
        return current;
      }

      if (arbTokenBridgeLoaded) {
        arbTokenBridgeRef.current.token?.addTokensFromList(data, LIFI_TRANSFER_LIST_ID);
      }

      return current.map((tokenList) => {
        if (tokenList.bridgeTokenListId !== LIFI_TRANSFER_LIST_ID) {
          return tokenList;
        }

        return {
          ...tokenList,
          ...data,
        };
      });
    }, false);
  }, [arbTokenBridgeLoaded, hasTokenLists, childChain.id, parentChain.id, mutate]);

  useInterval(refreshLifiTokenList, intervalMs);

  useEffect(() => {
    refreshLifiTokenList();
  }, [refreshLifiTokenList, parentChain.id, childChain.id]);
}
