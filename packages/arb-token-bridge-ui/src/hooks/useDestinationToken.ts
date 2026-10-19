import { useMemo } from 'react';

import { useAppState } from '../state';
import { resolveDestinationSelection } from '../util/TokenSelectionUtils';
import { ERC20BridgeToken } from './arbTokenBridge.types';
import { useArbQueryParams } from './useArbQueryParams';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';
import { useSelectedToken } from './useSelectedToken';

export function useDestinationSelection() {
  const [{ destinationToken: destinationTokenLookupKey }] = useArbQueryParams();
  const [sourceToken] = useSelectedToken();
  const [networks] = useNetworks();
  const { isDepositMode } = useNetworksRelationship(networks);
  const {
    app: {
      arbTokenBridge: { bridgeTokens },
    },
  } = useAppState();
  const sourceChainId = networks.sourceChain.id;
  const destinationChainId = networks.destinationChain.id;

  // Overrides allocate metadata; keep its identity stable for route effects.
  return useMemo(
    () =>
      resolveDestinationSelection({
        sourceToken,
        destinationTokenLookupKey,
        bridgeTokens,
        sourceChainId,
        destinationChainId,
        isDepositMode,
      }),
    [
      sourceToken,
      destinationTokenLookupKey,
      bridgeTokens,
      sourceChainId,
      destinationChainId,
      isDepositMode,
    ],
  );
}

/** Returning null lets the panel use the chain's native currency. */
export function useDestinationToken(): ERC20BridgeToken | null {
  return useDestinationSelection().token;
}
