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
      [ChainId.Ethereum]: '0x57e114b691db790c35207b2e685d4a43181e6061',
      [ChainId.Base]: '0x58538e6a46e07434d7e7375bc268d3cb839c0133',
      [ChainId.ArbitrumOne]: '0x58538e6a46e07434d7e7375bc268d3cb839c0133',
    },
  },
  {
    coinKey: 'USDT',
    addresses: {
      [ChainId.Ethereum]: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      [ChainId.Base]: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
      [ChainId.ArbitrumOne]: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
      [ChainId.ApeChain]: '0x674843C06FF83502ddb4D37c2E09C01cdA38cbc8',
    },
  },
];
const CUSTOM_TOKEN_LOOKUP = new Map<number, Map<string, CoinKey>>();
for (const customToken of CUSTOM_TOKENS) {
  for (const [chainId, address] of Object.entries(customToken.addresses)) {
    if (address) {
      const chainIdNum = Number(chainId);
      const chainMap = CUSTOM_TOKEN_LOOKUP.get(chainIdNum) ?? new Map<string, CoinKey>();
      chainMap.set(address.toLowerCase(), customToken.coinKey as CoinKey);
      CUSTOM_TOKEN_LOOKUP.set(chainIdNum, chainMap);
    }
  }
}

const EXCLUDED_ADDRESSES: Partial<Record<number, Set<string>>> = {
  [ChainId.ArbitrumOne]: new Set([
    '0x74885b4d524d497261259b38900f54e6dbad2210', // Old Ape token
    '0xb9c8f0d3254007ee4b98970b94544e473cd610ec', // Old QiDao token
  ]),
};

export type LifiTokenWithCoinKey = LiFiToken & { coinKey: CoinKey };

function isExcludedToken(token: LiFiToken, chainId: number): boolean {
  return EXCLUDED_ADDRESSES[chainId]?.has(token.address.toLowerCase()) ?? false;
}

/**
 * Assigns a custom CoinKey to tokens that don't have one but are configured in CUSTOM_TOKENS.
 * Also normalizes bridged token variants (USDCe) to their native equivalents (USDC) on specific chains.
 * Returns null if token has no coinKey and isn't in CUSTOM_TOKENS.
 */
function assignCustomCoinKey(token: LiFiToken, chainId: number): LifiTokenWithCoinKey | null {
  const normalizedAddress = token.address.toLowerCase();
  const customCoinKey = CUSTOM_TOKEN_LOOKUP.get(chainId)?.get(normalizedAddress);
  if (customCoinKey) {
    return { ...token, coinKey: customCoinKey };
  }

  if (token.coinKey) {
    const tokenWithCoinKey = token as LifiTokenWithCoinKey;

    // Normalize USDCe to USDC on chains that use bridged USDC
    if (
      tokenWithCoinKey.coinKey === CoinKey.USDCe &&
      (chainId === ChainId.ApeChain || chainId === ChainId.Superposition)
    ) {
      return { ...tokenWithCoinKey, coinKey: CoinKey.USDC };
    }

    return tokenWithCoinKey;
  }

  return null;
}

function assignLogoURI(token: LifiTokenWithCoinKey): LifiTokenWithCoinKey {
  switch (token.coinKey) {
    case CoinKey.ETH: {
      token.logoURI = '/images/EthereumLogoRound.svg';
      return token;
    }
    case CoinKey.APE: {
      token.logoURI = '/images/ApeChainLogo.svg';
      return token;
    }
  }

  return token;
}

function normalizeTokenMetadata(token: LifiTokenWithCoinKey): LifiTokenWithCoinKey {
  if (token.coinKey === CoinKey.USDT) {
    return {
      ...token,
      symbol: 'USDT',
      name: 'Tether USD',
    };
  }

  return token;
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

        const tokenWithLogoURI = assignLogoURI(tokenWithCoinKey);
        const normalizedToken = normalizeTokenMetadata(tokenWithLogoURI);

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
