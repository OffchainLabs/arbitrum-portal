import { TokenList } from '@uniswap/token-lists';

import {
  ADDITIONAL_ROUTE_TOKEN_CHAIN_CONFIG,
  type AdditionalRouteTokenChainConfig,
  getAdditionalRouteTokenChainConfig,
} from './additionalRouteTokens';
import type { LifiAdditionalRouteToken, LifiTokenWithCoinKey } from './registry';

export function getParentTokensForRoute({
  parentChainId,
  tokens,
}: {
  parentChainId: number;
  tokens: LifiTokenWithCoinKey[];
}) {
  const sourceTokenAddresses =
    getAdditionalRouteTokenChainConfig(parentChainId)?.sourceTokenAddresses;

  if (!sourceTokenAddresses) {
    return tokens;
  }

  return tokens.filter((token) => sourceTokenAddresses.has(token.address.toLowerCase()));
}

type AdditionalRouteTokenConfigs = Partial<Record<number, AdditionalRouteTokenChainConfig>>;

function buildAdditionalRouteTokenListToken({
  childChainId,
  parentChainId,
  childToken,
}: {
  childChainId: number;
  parentChainId: number;
  childToken: LifiAdditionalRouteToken;
}): TokenList['tokens'][number] {
  return {
    chainId: childChainId,
    address: childToken.address,
    name: childToken.name,
    symbol: childToken.symbol,
    decimals: childToken.decimals,
    logoURI: childToken.logoURI,
    extensions: {
      ...(childToken.priceUSD ? { priceUSD: childToken.priceUSD } : {}),
      isLifiDestinationOnly: true,
      bridgeInfo: {
        [parentChainId]: {
          tokenAddress: childToken.address,
          name: childToken.name,
          symbol: childToken.symbol,
          decimals: childToken.decimals,
          logoURI: childToken.logoURI,
        },
      },
    },
  };
}

export function appendAdditionalRouteTokens({
  childChainId,
  parentChainId,
  tokens,
  childAdditionalTokens,
  chainConfigs = ADDITIONAL_ROUTE_TOKEN_CHAIN_CONFIG,
}: {
  childChainId: number;
  parentChainId: number;
  tokens: TokenList['tokens'];
  childAdditionalTokens: LifiAdditionalRouteToken[];
  chainConfigs?: AdditionalRouteTokenConfigs;
}): TokenList['tokens'] {
  const childConfig = chainConfigs[childChainId];

  if (!childConfig?.includeUnmatchedChildTokens) {
    return tokens;
  }

  const result = tokens.slice();
  const existingChildTokenAddresses = new Set(tokens.map((token) => token.address.toLowerCase()));
  const unmatchedChildTokens = childAdditionalTokens.filter(
    (token) => !existingChildTokenAddresses.has(token.address.toLowerCase()),
  );

  for (const childToken of unmatchedChildTokens) {
    result.push(
      buildAdditionalRouteTokenListToken({
        childChainId,
        parentChainId,
        childToken,
      }),
    );
    existingChildTokenAddresses.add(childToken.address.toLowerCase());
  }

  return result;
}
