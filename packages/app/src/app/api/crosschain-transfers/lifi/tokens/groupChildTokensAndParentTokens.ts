import { CoinKey } from '@lifi/sdk';
import { TokenList } from '@uniswap/token-lists';

import {
  hasUnmatchedLifiTokens,
  isUnmatchedLifiTokenAllowed,
} from '@/bridge/app/api/crosschain-transfers/constants';
import { ChainId } from '@/bridge/types/ChainId';
import { addressesEqual, normalizeAddress } from '@/bridge/util/AddressUtils';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';
import { getWalletEcosystem } from '@/bridge/wallet/getWalletEcosystem';

import { LifiToken, LifiTokenWithCoinKey } from './registry';

type MapTokensParams = {
  parentTokens: LifiToken[];
  childTokens?: LifiToken[];
  childTokensByCoinKey: Record<string, LifiTokenWithCoinKey>;
  parentChainId: number;
  childChainId: number;
};

const getTokenId = (token: LifiToken) => `${token.chainId}:${normalizeAddress(token.address)}`;

/** Group parent tokens and child tokens based on coinkey */
export const groupChildTokensAndParentTokens = ({
  parentTokens,
  childTokensByCoinKey,
  childTokens = Object.values(childTokensByCoinKey),
  parentChainId,
  childChainId,
}: MapTokensParams): TokenList['tokens'] => {
  if (getWalletEcosystem(parentChainId) !== getWalletEcosystem(childChainId)) {
    return [...parentTokens, ...childTokens].map((token) => ({
      chainId: token.chainId,
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      logoURI: token.logoURI,
      extensions: token.priceUSD ? { priceUSD: token.priceUSD } : undefined,
    }));
  }
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
    const isCanonicalVirtual =
      childChainId === ChainId.RobinhoodChain &&
      addressesEqual(childToken.address, CommonAddress.RobinhoodChain.VIRTUAL_CANONICAL);
    const priceUSD = isCanonicalVirtual
      ? childToken.priceUSD
      : (childToken.priceUSD ?? token.priceUSD);
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
    if (!hasUnmatchedLifiTokens(chainId)) {
      continue;
    }

    for (const token of chainTokens) {
      if (!isUnmatchedLifiTokenAllowed(chainId, token.address)) {
        continue;
      }

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
