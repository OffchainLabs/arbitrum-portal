import { constants } from 'ethers';
import { useCallback, useEffect, useRef, useState } from 'react';

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
 * The banner shows when a non-USDG stablecoin is the destination on Robinhood Chain. The source
 * token plays no part: a stablecoin source pointed at any other asset, native ETH included, is
 * treated as a deliberate choice and left alone.
 */
export function isUsdgSuggested({
  destinationChainId,
  destinationTokenAddress,
}: {
  destinationChainId: number;
  destinationTokenAddress: string | undefined;
}): boolean {
  return (
    destinationChainId === ChainId.RobinhoodChain &&
    isStablecoin(destinationTokenAddress) &&
    !isTokenUSDG(destinationTokenAddress)
  );
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

  const isSuggested = isUsdgSuggested({ destinationChainId, destinationTokenAddress });

  // A dismissal only covers the selection that produced the suggestion. Any change to a chain or
  // token clears it, so picking a stablecoin again brings the banner back, even the one that was
  // dismissed. Missing addresses mean native ETH and are normalised to the zero address so the
  // fallback resolving after the fact does not count as a change.
  const selectionKey = [
    sourceChainId,
    destinationChainId,
    sourceTokenAddress ?? constants.AddressZero,
    destinationTokenAddress ?? constants.AddressZero,
  ]
    .join(':')
    .toLowerCase();
  const [dismissedSelectionKey, setDismissedSelectionKey] = useState<string | null>(null);
  const isVisible = isSuggested && dismissedSelectionKey !== selectionKey;

  useEffect(() => {
    if (dismissedSelectionKey !== null && dismissedSelectionKey !== selectionKey) {
      setDismissedSelectionKey(null);
    }
  }, [dismissedSelectionKey, selectionKey]);

  const usdgAddress = getUsdgDestinationTokenAddress(sourceChainId);
  const usdgLogoURI = tokensFromLists[usdgAddress.toLowerCase()]?.logoURI;

  const destinationSymbol =
    isSuggested && destinationToken
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

  const dismiss = useCallback(() => {
    trackEvent('USDG Suggestion Banner', {
      action: 'dismissed',
      sourceChainId,
      destinationChainId,
      sourceTokenAddress,
      destinationTokenAddress,
    });
    setDismissedSelectionKey(selectionKey);
  }, [
    destinationChainId,
    destinationTokenAddress,
    selectionKey,
    sourceChainId,
    sourceTokenAddress,
  ]);

  return { isVisible, destinationSymbol, usdgLogoURI, switchToUsdg, dismiss };
}
