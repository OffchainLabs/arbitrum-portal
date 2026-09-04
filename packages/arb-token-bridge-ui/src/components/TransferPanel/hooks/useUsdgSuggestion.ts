import { constants } from 'ethers';
import { useCallback, useEffect, useRef } from 'react';

import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useDestinationToken } from '../../../hooks/useDestinationToken';
import { useNetworks } from '../../../hooks/useNetworks';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { ChainId } from '../../../types/ChainId';
import { addressesEqual } from '../../../util/AddressUtils';
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
 * USDG: either a non-USDG stablecoin picked directly as the destination, or a stablecoin source
 * whose destination fell back to native ETH because no like-for-like route exists. A stablecoin
 * source the user pointed at some other asset on purpose is left alone.
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

  const isDestinationNativeEth =
    typeof destinationTokenAddress === 'undefined' ||
    addressesEqual(destinationTokenAddress, constants.AddressZero);

  return {
    isVisible:
      isDestinationStablecoin || (isDestinationNativeEth && isStablecoin(sourceTokenAddress)),
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
