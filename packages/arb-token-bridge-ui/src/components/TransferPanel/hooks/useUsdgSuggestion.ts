import { useCallback, useEffect, useRef } from 'react';

import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useDestinationToken } from '../../../hooks/useDestinationToken';
import { useNetworks } from '../../../hooks/useNetworks';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { ChainId } from '../../../types/ChainId';
import { trackEvent } from '../../../util/AnalyticsUtils';
import {
  getUsdgDestinationTokenAddress,
  isStablecoin,
  isTokenUSDG,
} from '../../../util/RobinhoodStablecoinUtils';
import { sanitizeTokenSymbol } from '../../../util/TokenUtils';
import { useTokensFromLists } from '../TokenSearchUtils';

/**
 * The banner shows when a transfer into Robinhood Chain involves a stablecoin but will not deliver
 * USDG. Either side qualifies: a stablecoin source that the user pointed at another destination
 * token, or a non-USDG stablecoin picked directly as the destination.
 */
export function getUsdgSuggestion({
  destinationChainId,
  sourceTokenAddress,
  destinationTokenAddress,
}: {
  destinationChainId: number;
  sourceTokenAddress: string | undefined;
  destinationTokenAddress: string | undefined;
}): { isVisible: boolean; isDestinationStablecoin: boolean } {
  const isDestinationStablecoin = isStablecoin(destinationTokenAddress);

  if (destinationChainId !== ChainId.RobinhoodChain || isTokenUSDG(destinationTokenAddress)) {
    return { isVisible: false, isDestinationStablecoin };
  }

  return {
    isVisible: isDestinationStablecoin || isStablecoin(sourceTokenAddress),
    isDestinationStablecoin,
  };
}

export function useUsdgSuggestion() {
  const [networks] = useNetworks();
  const [selectedToken] = useSelectedToken();
  const destinationToken = useDestinationToken();
  const [, setQueryParams] = useArbQueryParams();
  const { data: tokensFromLists } = useTokensFromLists();

  const sourceChainId = networks.sourceChain.id;
  const destinationChainId = networks.destinationChain.id;
  const sourceTokenAddress = selectedToken?.address;
  const destinationTokenAddress = destinationToken?.address;

  const { isVisible, isDestinationStablecoin } = getUsdgSuggestion({
    destinationChainId,
    sourceTokenAddress,
    destinationTokenAddress,
  });

  const usdgAddress = getUsdgDestinationTokenAddress(sourceChainId);
  const usdgLogoURI = tokensFromLists[usdgAddress.toLowerCase()]?.logoURI;

  const destinationSymbol =
    isDestinationStablecoin && destinationToken
      ? sanitizeTokenSymbol(destinationToken.symbol, {
          erc20L1Address: destinationToken.address,
          chainId: destinationChainId,
        })
      : undefined;

  // read through a ref so the tracking effect reports the tokens at exposure time without
  // re-firing when the user switches between two stablecoins while the banner stays visible.
  // Effects run in declaration order, so this sync lands before the tracking effect reads it.
  const tokenAddressesRef = useRef({ sourceTokenAddress, destinationTokenAddress });
  useEffect(() => {
    tokenAddressesRef.current = { sourceTokenAddress, destinationTokenAddress };
  });

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    trackEvent('USDG Suggestion Banner', {
      action: 'shown',
      sourceChainId,
      destinationChainId,
      ...tokenAddressesRef.current,
    });
  }, [isVisible, sourceChainId, destinationChainId]);

  const switchToUsdg = useCallback(() => {
    trackEvent('USDG Suggestion Banner', {
      action: 'switched',
      sourceChainId,
      destinationChainId,
      sourceTokenAddress,
      destinationTokenAddress,
    });
    // the route fetch keys on `destinationToken`, so the quote refreshes on its own
    setQueryParams({ destinationToken: usdgAddress });
  }, [
    destinationChainId,
    destinationTokenAddress,
    setQueryParams,
    sourceChainId,
    sourceTokenAddress,
    usdgAddress,
  ]);

  return { isVisible, destinationSymbol, usdgLogoURI, switchToUsdg };
}
