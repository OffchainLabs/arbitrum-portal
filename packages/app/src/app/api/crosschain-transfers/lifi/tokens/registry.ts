import { CoinKey, ChainId as LiFiChainId, type Token as LiFiToken, getTokens } from '@lifi/sdk';
import { unstable_cache } from 'next/cache';

import { ChainId } from '@/bridge/types/ChainId';

export const LIFI_TOKENS_REVALIDATE_SECONDS = 60 * 60;

export const ALLOWED_CHAIN_IDS = [
  ChainId.Ethereum,
  ChainId.Base,
  ChainId.ArbitrumOne,
  ChainId.ApeChain,
  ChainId.Superposition,
];

export const ALLOWED_SOURCE_CHAIN_IDS = ALLOWED_CHAIN_IDS;
export const ALLOWED_DESTINATION_CHAIN_IDS = ALLOWED_CHAIN_IDS.filter(
  (chainId) => chainId !== ChainId.Base,
);

const EXCLUDED_ADDRESSES: Partial<Record<number, Set<string>>> = {
  [ChainId.ArbitrumOne]: new Set(['0x74885b4d524d497261259b38900f54e6dbad2210']),
};

export type LifiTokenWithCoinKey = LiFiToken & { coinKey: CoinKey };
/**
 * Normalizes USDC tokens:
 * - Drops USDC.e on chains that have native USDC (Arbitrum, Base, Ethereum)
 * - Remaps USDC.e to USDC on ApeChain and Superposition
 * - Keeps all other tokens unchanged
 */
export function handleUSDC(token: LifiTokenWithCoinKey): LifiTokenWithCoinKey | null {
  if (token.coinKey !== CoinKey.USDCe) {
    return token;
  }

  // Drop USDC.e on chains that have native USDC.
  if (
    token.chainId === LiFiChainId.ARB ||
    token.chainId === LiFiChainId.BAS ||
    token.chainId === LiFiChainId.ETH
  ) {
    return null;
  }

  // Remap USDC.e to USDC
  if (token.chainId === LiFiChainId.APE || token.chainId === LiFiChainId.SUP) {
    return { ...token, coinKey: CoinKey.USDC };
  }

  return token;
}

export interface LifiTokenRegistry {
  tokensByChain: Record<number, LifiTokenWithCoinKey[]>;
  tokensByChainAndCoinKey: Record<number, Record<string, LifiTokenWithCoinKey>>;
}

const fetchRegistry = async (): Promise<LifiTokenRegistry> => {
  const response = await getTokens({ chains: ALLOWED_CHAIN_IDS as unknown as LiFiChainId[] });
  if (!response.tokens) {
    return {
      tokensByChain: {},
      tokensByChainAndCoinKey: {},
    };
  }

  const tokensByChain: LifiTokenRegistry['tokensByChain'] = {};
  const tokensByChainAndCoinKey: LifiTokenRegistry['tokensByChainAndCoinKey'] = {};

  for (const chainId of ALLOWED_CHAIN_IDS) {
    const tokensGroupedByCoinKey: Partial<Record<CoinKey, LifiTokenWithCoinKey>> = {};

    const filteredTokens = (response.tokens[chainId] ?? []).reduce<LifiTokenWithCoinKey[]>(
      (acc, token) => {
        // Exclude tokens on the exclude list or tokens without coinKey
        if (EXCLUDED_ADDRESSES[chainId]?.has(token.address)) return acc;
        if (!token.coinKey) return acc;

        const normalizedToken = handleUSDC(token as LifiTokenWithCoinKey);
        if (!normalizedToken) return acc;

        tokensGroupedByCoinKey[normalizedToken.coinKey] ??= normalizedToken;
        acc.push(normalizedToken);
        return acc;
      },
      [],
    );

    tokensByChain[chainId] = filteredTokens;
    tokensByChainAndCoinKey[chainId] = tokensGroupedByCoinKey;
  }

  return { tokensByChain, tokensByChainAndCoinKey };
};

export const getLifiTokenRegistry = unstable_cache(fetchRegistry, ['lifi-token-registry'], {
  revalidate: LIFI_TOKENS_REVALIDATE_SECONDS,
});
