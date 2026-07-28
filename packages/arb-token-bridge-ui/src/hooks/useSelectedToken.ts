import { utils } from 'ethers';
import { useCallback } from 'react';

import {
  useTokensFromLists,
  useTokensFromUser,
} from '../components/TransferPanel/TokenSearchUtils';
import { useAppState } from '../state';
import { L2_NATIVE_TOKENS_BY_CHAIN } from '../util/l2NativeTokens';
import { logger } from '../util/logger';
import { sanitizeNullSelectedToken } from '../util/queryParamUtils';
import { ERC20BridgeToken } from './arbTokenBridge.types';
import { useArbQueryParams } from './useArbQueryParams';

export { sanitizeNullSelectedToken } from '../util/queryParamUtils';

export const useSelectedToken = (): [
  ERC20BridgeToken | null,
  (erc20ParentAddress: string | null) => void,
] => {
  const [{ sourceChain, token: tokenFromSearchParams }, setQueryParams] = useArbQueryParams();
  const {
    app: {
      arbTokenBridge: { bridgeTokens },
    },
  } = useAppState();
  const { data: tokensFromLists } = useTokensFromLists();
  const tokensFromUser = useTokensFromUser();
  const l2NativeTokens = sourceChain ? (L2_NATIVE_TOKENS_BY_CHAIN[sourceChain] ?? {}) : {};

  const setSelectedToken = useCallback(
    (erc20ParentAddress: string | null) => {
      return setQueryParams((latestQuery) => {
        try {
          const sanitizedTokenAddress = sanitizeNullSelectedToken({
            sourceChainId: latestQuery.sourceChain,
            destinationChainId: latestQuery.destinationChain,
            erc20ParentAddress,
          });

          if (sanitizedTokenAddress) {
            return {
              token: sanitizedTokenAddress,
              destinationToken: sanitizedTokenAddress,
            };
          }

          return {
            token: sanitizeTokenAddress(erc20ParentAddress),
            destinationToken: sanitizeTokenAddress(erc20ParentAddress),
          };
        } catch (error) {
          logger.error('Error sanitizing token address:', error);
          return { token: undefined, destinationToken: undefined };
        }
      });
    },
    [setQueryParams],
  );

  const selectedTokenAddress = tokenFromSearchParams?.toLowerCase();
  const selectedToken = selectedTokenAddress
    ? bridgeTokens?.[selectedTokenAddress] ||
      l2NativeTokens[selectedTokenAddress] ||
      tokensFromUser[selectedTokenAddress] ||
      tokensFromLists[selectedTokenAddress] ||
      null
    : null;

  if (!tokenFromSearchParams) {
    return [null, setSelectedToken] as const;
  }

  return [selectedToken, setSelectedToken] as const;
};

function sanitizeTokenAddress(tokenAddress: string | null): string | undefined {
  if (!tokenAddress) {
    return undefined;
  }
  if (utils.isAddress(tokenAddress)) {
    return tokenAddress;
  }
  return undefined;
}
