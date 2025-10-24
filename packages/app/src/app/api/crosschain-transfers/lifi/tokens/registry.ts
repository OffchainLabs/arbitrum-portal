import { CoinKey, ChainId as LiFiChainId, type Token as LiFiToken, getTokens } from '@lifi/sdk';
import { unstable_cache } from 'next/cache';

import { allowedLifiSourceChainIds } from '@/bridge/app/api/crosschain-transfers/constants';
import { ChainId } from '@/bridge/types/ChainId';

export const LIFI_TOKENS_REVALIDATE_SECONDS = 60 * 60;

type CustomTokenConfig = {
  coinKey: string;
  addresses: Partial<Record<number, string>>;
};

const CUSTOM_TOKENS: CustomTokenConfig[] = [
  {
    coinKey: 'ENA',
    addresses: {
      [ChainId.Ethereum]: '0x57e114B691Db790C35207b2e685D4A43181e6061',
      [ChainId.Base]: '0x58538e6A46E07434d7E7375Bc268D3cb839C0133',
      [ChainId.ArbitrumOne]: '0x58538e6A46E07434d7E7375Bc268D3cb839C0133',
    },
  },
];

const EXCLUDED_ADDRESSES: Partial<Record<number, Set<string>>> = {
  [ChainId.ArbitrumOne]: new Set([
    '0x74885b4d524d497261259b38900f54e6dbad2210', // Old Ape token
    '0xB9C8F0d3254007eE4b98970b94544e473Cd610EC', // Old QiDao token
  ]),
};

export type LifiTokenWithCoinKey = LiFiToken & { coinKey: CoinKey };

function isExcludedToken(token: LiFiToken, chainId: number): boolean {
  return EXCLUDED_ADDRESSES[chainId]?.has(token.address.toLowerCase()) ?? false;
}

/**
 * Assigns a custom CoinKey to tokens that don't have one but are configured in CUSTOM_TOKENS.
 * Returns null if token has no coinKey and isn't in CUSTOM_TOKENS.
 */
function assignCustomCoinKey(token: LiFiToken, chainId: number): LifiTokenWithCoinKey | null {
  const normalizedAddress = token.address.toLowerCase();
  for (const customToken of CUSTOM_TOKENS) {
    const configuredAddress = customToken.addresses[chainId]?.toLowerCase();
    if (configuredAddress === normalizedAddress) {
      return { ...token, coinKey: customToken.coinKey as CoinKey };
    }
  }

  if (token.coinKey) {
    return token as LifiTokenWithCoinKey;
  }

  return null;
}

export interface LifiTokenRegistry {
  tokensByChain: Record<number, LifiTokenWithCoinKey[]>;
  tokensByChainAndCoinKey: Record<number, Record<string, LifiTokenWithCoinKey>>;
}

const fetchRegistry = async (): Promise<LifiTokenRegistry> => {
  const response = await getTokens({
    chains: allowedLifiSourceChainIds as unknown as LiFiChainId[],
  });
  if (!response.tokens) {
    return {
      tokensByChain: {},
      tokensByChainAndCoinKey: {},
    };
  }

  const tokensByChain: LifiTokenRegistry['tokensByChain'] = {};
  const tokensByChainAndCoinKey: LifiTokenRegistry['tokensByChainAndCoinKey'] = {};

  for (const chainId of allowedLifiSourceChainIds) {
    const tokensGroupedByCoinKey: Partial<Record<CoinKey, LifiTokenWithCoinKey>> = {};

    const filteredTokens = (response.tokens[chainId] ?? []).reduce<LifiTokenWithCoinKey[]>(
      (acc, token) => {
        // Exclude tokens on the exclude list
        if (isExcludedToken(token, chainId)) return acc;

        const tokenWithCoinKey = assignCustomCoinKey(token, chainId);
        if (!tokenWithCoinKey) return acc;

        tokensGroupedByCoinKey[tokenWithCoinKey.coinKey] ??= tokenWithCoinKey;
        acc.push(tokenWithCoinKey);
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
