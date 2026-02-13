import { useCallback, useEffect, useRef } from 'react';
import { useInterval } from 'react-use';

import { useAppState } from '../state';
import {
  LIFI_TRANSFER_LIST_ID,
  fetchTokenListFromURL,
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
  const { mutate } = useTokenLists(childChain.id);
  const arbTokenBridgeRef = useRef(arbTokenBridge);

  useEffect(() => {
    arbTokenBridgeRef.current = arbTokenBridge;
  }, [arbTokenBridge]);

  const refreshLifiTokenList = useCallback(() => {
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

      const { data } = await fetchTokenListFromURL(lifiTokenList.url);
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
  }, [arbTokenBridgeLoaded, childChain.id, parentChain.id, mutate]);

  useInterval(refreshLifiTokenList, intervalMs);

  useEffect(() => {
    refreshLifiTokenList();
  }, [refreshLifiTokenList, parentChain.id, childChain.id]);
}
