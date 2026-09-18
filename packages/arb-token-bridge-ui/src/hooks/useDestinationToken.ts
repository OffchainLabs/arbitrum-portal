import { useMemo } from 'react';

import { useTokensFromLists } from '../components/TransferPanel/TokenSearchUtils';
import { useAppState } from '../state';
import { resolveDestinationSelection } from '../util/TokenSelectionUtils';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
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
  const { data: tokensFromLists } = useTokensFromLists();
  const sourceChainId = networks.sourceChain.id;
  const destinationChainId = networks.destinationChain.id;
  // The Arbitrum token bridge only loads between EVM chains, so other pairs read the token lists
  const destinationTokens =
    getWalletEcosystem(sourceChainId) === getWalletEcosystem(destinationChainId)
      ? bridgeTokens
      : tokensFromLists;

  // Overrides allocate metadata; keep its identity stable for route effects.
  return useMemo(
    () =>
      resolveDestinationSelection({
        sourceToken,
        destinationTokenLookupKey,
        bridgeTokens: destinationTokens,
        sourceChainId,
        destinationChainId,
        isDepositMode,
      }),
    [
      sourceToken,
      destinationTokenLookupKey,
      destinationTokens,
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
