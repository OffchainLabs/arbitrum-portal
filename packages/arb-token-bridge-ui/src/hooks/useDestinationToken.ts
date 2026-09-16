import { constants } from 'ethers';
import { useMemo } from 'react';

import { getTokenOverride } from '../app/api/crosschain-transfers/utils';
import { useAppState } from '../state';
import { addressesEqual } from '../util/AddressUtils';
import { isTokenAvailableOnChain } from '../util/TokenListUtils';
import { isSameTokenSelection } from '../util/TokenSelectionUtils';
import { ERC20BridgeToken } from './arbTokenBridge.types';
import { useArbQueryParams } from './useArbQueryParams';
import { useNetworks } from './useNetworks';
import { useSelectedToken } from './useSelectedToken';

/**
 * Resolves the destination selection to a token available on the destination chain.
 * Returning null lets the panel use the chain's native currency.
 */
export function useDestinationToken(): ERC20BridgeToken | null {
  const [{ destinationToken: destinationTokenLookupKey }] = useArbQueryParams();
  const [sourceToken] = useSelectedToken();
  const [networks] = useNetworks();
  const {
    app: {
      arbTokenBridge: { bridgeTokens },
    },
  } = useAppState();
  const nativeTokenOverride = useMemo(
    () =>
      getTokenOverride({
        fromToken: constants.AddressZero,
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id,
      }),
    [networks.destinationChain.id, networks.sourceChain.id],
  );
  // Memoized so the returned token keeps a stable identity across renders.
  const sourceTokenOverride = useMemo(
    () =>
      getTokenOverride({
        fromToken: sourceToken?.address,
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id,
      }),
    [networks.destinationChain.id, networks.sourceChain.id, sourceToken?.address],
  );

  const isSameToken = isSameTokenSelection({
    sourceToken,
    destinationTokenLookupKey,
    destinationChainId: networks.destinationChain.id,
  });
  if (isSameToken) {
    return sourceToken;
  }

  const isSourceTokenSelectedAsDestination = addressesEqual(
    destinationTokenLookupKey,
    sourceToken?.address,
  );
  if (isSourceTokenSelectedAsDestination) {
    // An old URL may repeat a source-only token's address. Use an explicit
    // destination mapping if one exists; otherwise null selects native currency.
    return sourceTokenOverride.destination;
  }

  if (!destinationTokenLookupKey) {
    return null;
  }

  // The zero address represents ETH, with overrides such as WETH on ApeChain.
  if (addressesEqual(destinationTokenLookupKey, constants.AddressZero)) {
    return nativeTokenOverride.destination;
  }

  const destinationToken = bridgeTokens?.[destinationTokenLookupKey.toLowerCase()];
  if (!destinationToken) {
    return null;
  }

  const isDestinationTokenAvailable = isTokenAvailableOnChain(
    destinationToken,
    networks.destinationChain.id,
  );
  if (!isDestinationTokenAvailable) {
    return null;
  }

  return destinationToken;
}
