import { CoinKey } from '@lifi/sdk';
import { TokenList } from '@uniswap/token-lists';

import { ChainId } from '@/bridge/types/ChainId';

import { LifiTokenWithCoinKey } from './registry';

type MapTokensParams = {
  parentTokens: LifiTokenWithCoinKey[];
  childTokensByCoinKey: Record<string, LifiTokenWithCoinKey>;
  parentChainId: number;
  childChainId: number;
};

/** Group parent tokens and child tokens based on coinkey */
export const groupChildTokensAndParentTokens = ({
  parentTokens,
  childTokensByCoinKey,
  parentChainId,
  childChainId,
}: MapTokensParams): TokenList['tokens'] => {
  return parentTokens.reduce<TokenList['tokens']>((acc, token) => {
    const childToken =
      childChainId === ChainId.ApeChain && token.coinKey === CoinKey.ETH
        ? childTokensByCoinKey[CoinKey.WETH]
        : childTokensByCoinKey[token.coinKey];

    if (!childToken) {
      return acc;
    }

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
};
