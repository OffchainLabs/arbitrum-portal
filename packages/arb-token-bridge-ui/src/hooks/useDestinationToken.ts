import { constants } from 'ethers';
import { useMemo } from 'react';

import { getTokenOverride } from '../app/api/crosschain-transfers/utils';
import { useTokensFromLists } from '../components/TransferPanel/TokenSearchUtils';
import { useIsSwapTransfer } from '../components/TransferPanel/hooks/useIsSwapTransfer';
import { useAppState } from '../state';
import { addressesEqual } from '../util/AddressUtils';
import { areEquivalentBridgeTokens } from '../util/BridgeTokenAddressUtils';
import { ERC20BridgeToken } from './arbTokenBridge.types';
import { useArbQueryParams } from './useArbQueryParams';
import { useNetworks } from './useNetworks';
import { useSelectedToken } from './useSelectedToken';

/**
 * Returns the destination token based on the destinationToken and token query parameters.
 *
 * - If destinationToken === selectedToken.address: return selectedToken
 * - If destinationToken is the zeroAddress: return ETH token (happen on chain with custom gas token)
 * - If destinationToken is set to a specific address: return that token from bridgeTokens
 * - If destinationToken is null: return null
 */
export function useDestinationToken(): ERC20BridgeToken | null {
  const [{ destinationToken }] = useArbQueryParams();
  const [selectedToken] = useSelectedToken();
  const [networks] = useNetworks();
  const {
    app: {
      arbTokenBridge: { bridgeTokens },
    },
  } = useAppState();
  const tokensFromLists = useTokensFromLists();
  const isSwapTransfer = useIsSwapTransfer();
  const selectedTokenOverride = useMemo(
    () =>
      getTokenOverride({
        fromToken: selectedToken?.address,
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id,
      }),
    [networks.destinationChain.id, networks.sourceChain.id, selectedToken?.address],
  );
  const overrideToken = useMemo(
    () =>
      getTokenOverride({
        fromToken: constants.AddressZero,
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id,
      }),
    [networks.destinationChain.id, networks.sourceChain.id],
  );

  return useMemo(() => {
    if (!destinationToken) {
      return null;
    }

    if (!isSwapTransfer) {
      return getNonSwapDestinationToken({
        selectedToken,
        bridgeTokens,
        selectedTokenOverrideDestination: withDestinationTokenMetadata({
          token: selectedTokenOverride.destination,
          metadataSource: selectedToken,
        }),
      });
    }

    // Case 1: For OFT token that have multiple L2 addresses (canonical and OFT) for one L1 address,
    // the destinationToken query param may equal the selected token's L1 address while the effective destination token is actually the OFT.
    // In that case, prefer the resolved override destination so swap handling and network switching stay aligned.
    if (
      selectedTokenOverride.destination &&
      destinationToken &&
      addressesEqual(destinationToken, selectedToken?.address)
    ) {
      return withDestinationTokenMetadata({
        token: selectedTokenOverride.destination,
        metadataSource: selectedToken,
      });
    }

    // Case 2: destinationToken is the zeroAddress -> Return ETH
    // Use getTokenOverride to handle special cases like ApeChain WETH
    if (destinationToken && addressesEqual(destinationToken, constants.AddressZero)) {
      return overrideToken.destination;
    }

    // Case 3: destinationToken is set to a specific token address
    if (destinationToken) {
      return (
        tokensFromLists[destinationToken.toLowerCase()] ??
        bridgeTokens?.[destinationToken.toLowerCase()] ??
        null
      );
    }

    // destinationToken is already guarded above, so this is just a defensive fallback.
    return null;
  }, [
    bridgeTokens,
    destinationToken,
    isSwapTransfer,
    overrideToken.destination,
    selectedToken,
    selectedTokenOverride.destination,
    tokensFromLists,
  ]);
}

function withDestinationTokenMetadata({
  token,
  metadataSource,
}: {
  token: ERC20BridgeToken | null;
  metadataSource: ERC20BridgeToken | null;
}) {
  if (!token || !metadataSource) {
    return token;
  }

  if (!areEquivalentBridgeTokens(token, metadataSource)) {
    return token;
  }

  return {
    ...token,
    logoURI:
      metadataSource.address === metadataSource.importLookupAddress
        ? metadataSource.logoURI
        : token.logoURI,
    priceUSD: token.priceUSD ?? metadataSource.priceUSD,
    listIds: token.listIds.size > 0 ? token.listIds : new Set(metadataSource.listIds),
  };
}

function getNonSwapDestinationToken({
  selectedToken,
  bridgeTokens,
  selectedTokenOverrideDestination,
}: {
  selectedToken: ERC20BridgeToken | null;
  bridgeTokens: Record<string, ERC20BridgeToken | undefined> | undefined;
  selectedTokenOverrideDestination: ERC20BridgeToken | null;
}) {
  if (selectedTokenOverrideDestination) {
    return selectedTokenOverrideDestination;
  }

  if (
    !selectedToken?.destinationBalanceAddress ||
    addressesEqual(selectedToken.address, selectedToken.destinationBalanceAddress)
  ) {
    return selectedToken;
  }

  return (
    bridgeTokens?.[selectedToken.destinationBalanceAddress.toLowerCase()] ?? {
      ...selectedToken,
      address: selectedToken.destinationBalanceAddress,
      l2Address: undefined,
    }
  );
}
