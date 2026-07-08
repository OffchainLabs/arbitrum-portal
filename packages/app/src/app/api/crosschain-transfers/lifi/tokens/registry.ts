import { CoinKey, ChainId as LiFiChainId, type Token as LiFiToken, getTokens } from '@lifi/sdk';
import { unstable_cache } from 'next/cache';

import { allowedLifiSourceChainIds } from '@/bridge/app/api/crosschain-transfers/constants';
import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

import { ADDITIONAL_ROUTE_TOKEN_CHAIN_IDS } from './additionalRouteTokens';

type CustomTokenConfig = {
  coinKey: string;
  addresses: Partial<Record<number, string>>;
};

const CUSTOM_TOKENS: CustomTokenConfig[] = [
  {
    coinKey: 'PYUSD',
    addresses: {
      [ChainId.Ethereum]: CommonAddress.Ethereum.PYUSD,
      [ChainId.ArbitrumOne]: CommonAddress.ArbitrumOne.PYUSD,
    },
  },
  {
    coinKey: 'ENA',
    addresses: {
      [ChainId.Ethereum]: CommonAddress.Ethereum.ENA,
      [ChainId.Base]: CommonAddress.Base.ENA,
      [ChainId.ArbitrumOne]: CommonAddress.ArbitrumOne.ENA,
      [ChainId.RobinhoodChain]: CommonAddress.RobinhoodChain.ENA,
    },
  },
  {
    coinKey: 'USDe',
    addresses: {
      [ChainId.Ethereum]: CommonAddress.Ethereum.USDe,
      [ChainId.Base]: CommonAddress.Base.USDe,
      [ChainId.ArbitrumOne]: CommonAddress.ArbitrumOne.USDe,
      [ChainId.RobinhoodChain]: CommonAddress.RobinhoodChain.USDe,
    },
  },
  {
    coinKey: 'sUSDe',
    addresses: {
      [ChainId.Ethereum]: CommonAddress.Ethereum.sUSDe,
      [ChainId.Base]: CommonAddress.Base.sUSDe,
      [ChainId.ArbitrumOne]: CommonAddress.ArbitrumOne.sUSDe,
      [ChainId.RobinhoodChain]: CommonAddress.RobinhoodChain.sUSDe,
    },
  },
  {
    coinKey: 'USDG',
    addresses: {
      [ChainId.Ethereum]: CommonAddress.Ethereum.USDG,
      [ChainId.RobinhoodChain]: CommonAddress.RobinhoodChain.USDG,
    },
  },
  {
    coinKey: 'spUSDG',
    addresses: {
      [ChainId.RobinhoodChain]: CommonAddress.RobinhoodChain.spUSDG,
    },
  },
  {
    coinKey: 'weETH',
    addresses: {
      [ChainId.Ethereum]: CommonAddress.Ethereum.WEETH,
      [ChainId.Base]: CommonAddress.Base.WEETH,
      [ChainId.ArbitrumOne]: CommonAddress.ArbitrumOne.WEETH,
      [ChainId.RobinhoodChain]: CommonAddress.RobinhoodChain.WEETH,
    },
  },
  {
    coinKey: 'syrupUSDG',
    addresses: {
      [ChainId.RobinhoodChain]: CommonAddress.RobinhoodChain.SyrupUSDG,
    },
  },
  {
    coinKey: 'wstETH',
    addresses: {
      [ChainId.Ethereum]: CommonAddress.Ethereum.WSTETH,
      [ChainId.Base]: CommonAddress.Base.WSTETH,
      [ChainId.ArbitrumOne]: CommonAddress.ArbitrumOne.WSTETH,
      [ChainId.RobinhoodChain]: CommonAddress.RobinhoodChain.WSTETH,
    },
  },
  {
    coinKey: 'USDT',
    addresses: {
      [ChainId.Ethereum]: CommonAddress.Ethereum.USDT,
      [ChainId.Base]: CommonAddress.Base.USDT,
      [ChainId.ArbitrumOne]: CommonAddress.ArbitrumOne.USDT,
      [ChainId.ApeChain]: CommonAddress.ApeChain.USDT,
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
  [ChainId.Ethereum]: new Set([
    // LiFi marks this PulseChain-wrapped token as CoinKey.WETH, which duplicates canonical Ethereum WETH in child token lists.
    '0xb1a7f8b3ada1cbd7752c1306725b07d2f8b4e726',
  ]),
  [ChainId.ArbitrumOne]: new Set([
    '0x74885b4d524d497261259b38900f54e6dbad2210', // Old Ape token
    '0xb9c8f0d3254007ee4b98970b94544e473cd610ec', // Old QiDao token
  ]),
};

export type LifiAdditionalRouteToken = Pick<
  LiFiToken,
  'chainId' | 'address' | 'name' | 'symbol' | 'decimals' | 'logoURI' | 'priceUSD' | 'coinKey'
>;
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
  additionalTokensByChain: Record<number, LifiAdditionalRouteToken[]>;
  tokensByChain: Record<number, LifiTokenWithCoinKey[]>;
  tokensByChainAndCoinKey: Record<number, Record<string, LifiTokenWithCoinKey>>;
}

const fetchRegistry = async (): Promise<LifiTokenRegistry> => {
  const response = await getTokens({
    chains: allowedLifiSourceChainIds as unknown as LiFiChainId[],
  });

  if (!response.tokens) {
    return {
      additionalTokensByChain: {},
      tokensByChain: {},
      tokensByChainAndCoinKey: {},
    };
  }

  const additionalRouteTokenChainIds = new Set(ADDITIONAL_ROUTE_TOKEN_CHAIN_IDS);
  const additionalTokensByChain: LifiTokenRegistry['additionalTokensByChain'] = {};
  const tokensByChain: LifiTokenRegistry['tokensByChain'] = {};
  const tokensByChainAndCoinKey: LifiTokenRegistry['tokensByChainAndCoinKey'] = {};

  for (const chainId of allowedLifiSourceChainIds) {
    const tokensGroupedByCoinKey: Partial<Record<CoinKey, LifiTokenWithCoinKey>> = {};
    const rawTokens = response.tokens[chainId] ?? [];
    const includedTokens = rawTokens.filter((token) => !isExcludedToken(token, chainId));
    additionalTokensByChain[chainId] = additionalRouteTokenChainIds.has(chainId)
      ? includedTokens
      : [];

    const filteredTokens = includedTokens.reduce<LifiTokenWithCoinKey[]>((acc, token) => {
      const tokenWithCoinKey = assignCustomCoinKey(token, chainId);
      if (!tokenWithCoinKey) return acc;

      const tokenWithLogoURI = assignLogoURI(tokenWithCoinKey);
      const normalizedToken = normalizeTokenMetadata(tokenWithLogoURI);

      tokensGroupedByCoinKey[normalizedToken.coinKey] ??= normalizedToken;
      acc.push(normalizedToken);
      return acc;
    }, []);

    tokensByChain[chainId] = filteredTokens;
    tokensByChainAndCoinKey[chainId] = tokensGroupedByCoinKey;
  }

  return { additionalTokensByChain, tokensByChain, tokensByChainAndCoinKey };
};

export const getLifiTokenRegistry = unstable_cache(fetchRegistry, ['lifi-token-registry'], {
  revalidate: 30,
});
