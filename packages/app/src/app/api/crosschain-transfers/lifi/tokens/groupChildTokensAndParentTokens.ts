import { CoinKey, type Token as LiFiToken } from '@lifi/sdk';
import { TokenList } from '@uniswap/token-lists';

import { allowsUnmatchedLifiTokens } from '@/bridge/app/api/crosschain-transfers/constants';
import { ChainId } from '@/bridge/types/ChainId';

import { LifiTokenWithCoinKey } from './registry';

type MapTokensParams = {
  parentTokens: LiFiToken[];
  childTokens?: LiFiToken[];
  childTokensByCoinKey: Record<string, LifiTokenWithCoinKey>;
  parentChainId: number;
  childChainId: number;
};

const getTokenId = (token: LiFiToken) => `${token.chainId}:${token.address.toLowerCase()}`;

/** Group parent tokens and child tokens based on coinkey */
export const groupChildTokensAndParentTokens = ({
  parentTokens,
  childTokensByCoinKey,
  childTokens = Object.values(childTokensByCoinKey),
  parentChainId,
  childChainId,
}: MapTokensParams): TokenList['tokens'] => {
  const includedTokens = new Set<string>();

  const tokens = parentTokens.reduce<TokenList['tokens']>((acc, token) => {
    if (!token.coinKey) {
      return acc;
    }

    const childToken =
      childChainId === ChainId.ApeChain && token.coinKey === CoinKey.ETH
        ? childTokensByCoinKey[CoinKey.WETH]
        : childTokensByCoinKey[token.coinKey];

    if (!childToken) {
      return acc;
    }

    includedTokens.add(getTokenId(token));
    includedTokens.add(getTokenId(childToken));

    // Some tokens on Lifi are missing logoURIs, so we fallback to the other token's logoURI if available
    const fallbackLogoURI = childToken.logoURI ?? token.logoURI;
    const priceUSD = childToken.priceUSD ?? token.priceUSD;
    acc.push({
      chainId: childChainId,
      address: childToken.address,
      name: childToken.name,
      symbol: childToken.symbol,
      decimals: childToken.decimals,
      logoURI: fallbackLogoURI,
      extensions: {
        ...(priceUSD ? { priceUSD } : {}),
        bridgeInfo: {
          [parentChainId]: {
            tokenAddress: token.address,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            logoURI: token.logoURI,
          },
        },
      },
    });
    return acc;
  }, []);

  for (const [chainId, chainTokens] of [
    [parentChainId, parentTokens],
    [childChainId, childTokens],
  ] as const) {
    if (!allowsUnmatchedLifiTokens(chainId)) {
      continue;
    }

    for (const token of chainTokens) {
      const id = getTokenId(token);
      if (includedTokens.has(id)) {
        continue;
      }

      tokens.push({
        chainId: token.chainId,
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        logoURI: token.logoURI,
        extensions: token.priceUSD ? { priceUSD: token.priceUSD } : undefined,
      });
      includedTokens.add(id);
    }
  }

  return tokens;
};
