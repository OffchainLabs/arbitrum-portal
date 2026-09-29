import { useCallback } from 'react';
import useSWRImmutable from 'swr/immutable';

import {
  useTokensFromLists,
  useTokensFromUser,
} from '../components/TransferPanel/TokenSearchUtils';
import { getUsdcToken } from '../services/tokenMetadata';
import { useAppState } from '../state';
import { ChainId } from '../types/ChainId';
import { isValidAddress, normalizeAddress } from '../util/AddressUtils';
import { resolveDestinationSelection, selectUsdcToken } from '../util/TokenSelectionUtils';
import { isTokenNativeUSDC } from '../util/TokenUtils';
import { logger } from '../util/logger';
import { sanitizeNullSelectedToken } from '../util/queryParamUtils';
import { ERC20BridgeToken } from './arbTokenBridge.types';
import { useArbQueryParams } from './useArbQueryParams';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';

export { sanitizeNullSelectedToken } from '../util/queryParamUtils';

export const useSelectedToken = (): [
  ERC20BridgeToken | null,
  (erc20ParentAddress: string | null, tokenOverride?: ERC20BridgeToken) => void,
] => {
  const [{ token: tokenFromSearchParams }, setQueryParams] = useArbQueryParams();
  const [networks] = useNetworks();
  const { childChain, parentChain, isDepositMode } = useNetworksRelationship(networks);
  const {
    app: {
      arbTokenBridge: { bridgeTokens },
    },
  } = useAppState();
  const { data: tokensFromLists } = useTokensFromLists();
  const tokensFromUser = useTokensFromUser();

  const { data: usdcToken } = useSWRImmutable(
    [
      tokenFromSearchParams,
      parentChain.id,
      childChain.id,
      networks.destinationChain.id,
      'useSelectedToken_usdc',
    ],
    async ([_tokenAddress, _parentChainId, _childChainId, _destinationChainId]) => {
      if (!_tokenAddress) {
        return null;
      }

      if (!isTokenNativeUSDC(_tokenAddress)) {
        return null;
      }

      // USDC for lifi chains, use bridgeTokens
      if (_destinationChainId === ChainId.ApeChain) {
        return null;
      }

      return getUsdcToken({
        tokenAddress: _tokenAddress,
        parentChainId: _parentChainId,
        childChainId: _childChainId,
      });
    },
  );

  const setSelectedToken = useCallback(
    (erc20ParentAddress: string | null, tokenOverride?: ERC20BridgeToken) => {
      return setQueryParams((latestQuery) => {
        try {
          const sanitizedTokenAddress = sanitizeNullSelectedToken({
            sourceChainId: latestQuery.sourceChain,
            destinationChainId: latestQuery.destinationChain,
            erc20ParentAddress,
          });
          const tokenAddress = sanitizedTokenAddress ?? sanitizeTokenAddress(erc20ParentAddress);
          const tokenStorageAddress = normalizeAddress(erc20ParentAddress ?? tokenAddress) ?? '';
          const token =
            tokenOverride ||
            tokensFromUser[tokenStorageAddress] ||
            tokensFromLists[tokenStorageAddress];
          const destination = resolveDestinationSelection({
            sourceToken: token ?? null,
            sourceTokenAddress: tokenAddress,
            destinationTokenLookupKey: tokenAddress,
            isDepositMode,
            sourceChainId: networks.sourceChain.id,
            destinationChainId: networks.destinationChain.id,
          });
          return { token: tokenAddress, destinationToken: destination.lookupKey };
        } catch (error) {
          logger.error('Error sanitizing token address:', error);
          return { token: undefined, destinationToken: undefined };
        }
      });
    },
    [
      isDepositMode,
      networks.destinationChain.id,
      networks.sourceChain.id,
      setQueryParams,
      tokensFromLists,
      tokensFromUser,
    ],
  );

  if (!tokenFromSearchParams) {
    return [null, setSelectedToken] as const;
  }

  const storedToken =
    bridgeTokens?.[tokenFromSearchParams] ??
    tokensFromUser[tokenFromSearchParams] ??
    tokensFromLists[tokenFromSearchParams];
  const selectedToken = selectUsdcToken({ usdcToken, storedToken });

  return [selectedToken, setSelectedToken] as const;
};

function sanitizeTokenAddress(tokenAddress: string | null): string | undefined {
  if (!tokenAddress) {
    return undefined;
  }
  if (isValidAddress(tokenAddress)) {
    return tokenAddress;
  }
  return undefined;
}
