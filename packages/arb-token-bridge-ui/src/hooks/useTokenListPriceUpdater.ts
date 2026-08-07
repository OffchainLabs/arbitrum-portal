import { useEffect, useRef } from 'react';

import { useAppState } from '../state';
import { LIFI_TRANSFER_LIST_ID } from '../util/TokenListUtils';
import { useLifiTokenList } from './useTokenLists';

/**
 * Keeps the bridge tokens in sync with the polled LiFi token list, so token prices stay fresh.
 *
 * This is the single polling owner for the LiFi token list. It is mounted once, from `MainContent`.
 */
export function useTokenListPriceUpdater(): void {
  const {
    app: { arbTokenBridge, arbTokenBridgeLoaded },
  } = useAppState();
  const { data: lifiTokenList } = useLifiTokenList({ poll: true });
  const arbTokenBridgeRef = useRef(arbTokenBridge);

  useEffect(() => {
    arbTokenBridgeRef.current = arbTokenBridge;
  }, [arbTokenBridge]);

  useEffect(() => {
    if (!arbTokenBridgeLoaded || !lifiTokenList) {
      return;
    }

    arbTokenBridgeRef.current.token?.addTokensFromList(lifiTokenList, LIFI_TRANSFER_LIST_ID);
  }, [arbTokenBridgeLoaded, lifiTokenList]);
}
