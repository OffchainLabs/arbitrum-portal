import { CoinKey, ChainId as LiFiChainId, type Token as LifiSdkToken, getTokens } from '@lifi/sdk';
import { constants } from 'ethers';
import { unstable_cache } from 'next/cache';

import {
  allowedLifiSourceChainIds,
  isUnmatchedLifiTokenAllowed,
} from '@/bridge/app/api/crosschain-transfers/constants';
import { ChainId } from '@/bridge/types/ChainId';
import { addressesEqual } from '@/bridge/util/AddressUtils';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

type CustomTokenConfig = {
  coinKey: string;
  addresses: Partial<Record<number, string>>;
};

const VIRTUAL_COIN_KEY = 'VIRTUAL' as CoinKey;
const VIRTUAL_LOGO_URI =
  'https://static.debank.com/image/eth_token/logo_url/0x44ff8620b8ca30902395a7bd3f2407e1a091bf73/cbb70834d9442214c846833e47648255.png';

const USDG_COIN_KEY = 'USDG' as CoinKey;
const USDG_LOGO_URI =
  'https://static.debank.com/image/eth_token/logo_url/0xe343167631d89b6ffc58b88d6b7fb0228795491d/4cbeae5d28b9db12bcf655fae7a328bb.png';

const CUSTOM_TOKENS: CustomTokenConfig[] = [
  {
    coinKey: VIRTUAL_COIN_KEY,
    addresses: {
      [ChainId.Ethereum]: CommonAddress.Ethereum.VIRTUAL,
      [ChainId.RobinhoodChain]: CommonAddress.RobinhoodChain.VIRTUAL,
    },
  },
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
    coinKey: USDG_COIN_KEY,
    addresses: {
      [ChainId.Ethereum]: CommonAddress.Ethereum.USDG,
      [ChainId.ArbitrumOne]: CommonAddress.ArbitrumOne.USDG,
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
  {
    coinKey: 'SFI',
    addresses: {
      [ChainId.Ethereum]: CommonAddress.Ethereum.SFI,
      [ChainId.ArbitrumOne]: CommonAddress.ArbitrumOne.SFI,
      [ChainId.RobinhoodChain]: CommonAddress.RobinhoodChain.SFI,
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
  [ChainId.RobinhoodChain]: new Set([
    CommonAddress.RobinhoodChain.VIRTUAL_CANONICAL,
    // LiFi lists two tokens with the "USDG" symbol on Robinhood Chain. This one is named
    // "Paxos USDG" on chain, has no LiFi coinKey and a supply of about 1,100 USDG. The live one is
    // "Global Dollar" at CommonAddress.RobinhoodChain.USDG (0x5fc5360d...16f1d168), LiFi coinKey
    // USDG, mapped in CUSTOM_TOKENS above. Excluding this one keeps a single USDG row.
    '0x0a3b763d66c0e8c7555c986a3701e1dc1bf3954f',
  ]),
  // LiFi lists HYPE, Elysium's native currency, at the zero address. The bridge already shows it as the
  // native currency, and reads the zero address as ETH on EVM routes.
  [ChainId.Elysium]: new Set([constants.AddressZero]),
};

// Only the fields the route reads. LiFi tokens also carry verification data that takes most of the
// response size, and the cache entries must stay under Next's 2 MB limit.
export type LifiToken = Pick<
  LifiSdkToken,
  'address' | 'symbol' | 'name' | 'decimals' | 'coinKey' | 'logoURI'
> & {
  chainId: number;
  priceUSD?: string;
};
export type LifiTokenWithCoinKey = LifiToken & { coinKey: CoinKey };

function isExcludedToken(token: LifiSdkToken, chainId: number): boolean {
  return EXCLUDED_ADDRESSES[chainId]?.has(token.address.toLowerCase()) ?? false;
}

// LiFi lists about 5,800 Solana tokens and fewer than half are verified. Listing only the verified
// ones among those without a coinKey keeps the token list small enough to load quickly.
const VERIFIED_ONLY_UNMATCHED_TOKEN_CHAIN_IDS = new Set<number>([ChainId.Solana]);

// LiFi's API returns `verificationStatus`, but its SDK `Token` type leaves it out
type LifiApiToken = LifiSdkToken & { verificationStatus?: 'verified' | 'unverified' | 'flagged' };

function isListedUnmatchedToken(token: LifiApiToken, chainId: number): boolean {
  if (!isUnmatchedLifiTokenAllowed(chainId, token.address)) return false;

  return (
    !VERIFIED_ONLY_UNMATCHED_TOKEN_CHAIN_IDS.has(chainId) || token.verificationStatus === 'verified'
  );
}

/**
 * Assigns a custom CoinKey to tokens that don't have one but are configured in CUSTOM_TOKENS.
 * Also normalizes bridged token variants (USDCe) to their native equivalents (USDC) on specific chains.
 * Returns null if token has no coinKey and isn't in CUSTOM_TOKENS.
 */
function assignCustomCoinKey(token: LifiSdkToken, chainId: number): LifiTokenWithCoinKey | null {
  const normalizedAddress = token.address.toLowerCase();
  const customCoinKey = CUSTOM_TOKEN_LOOKUP.get(chainId)?.get(normalizedAddress);
  if (customCoinKey) {
    return { ...token, coinKey: customCoinKey };
  }

  if (token.coinKey) {
    const tokenWithCoinKey = token as LifiTokenWithCoinKey;

    // Normalize USDCe to USDC on chains that use bridged USDC
    if (tokenWithCoinKey.coinKey === CoinKey.USDCe && chainId === ChainId.ApeChain) {
      return { ...tokenWithCoinKey, coinKey: CoinKey.USDC };
    }

    return tokenWithCoinKey;
  }

  return null;
}

function assignLogoURI(token: LifiTokenWithCoinKey): LifiTokenWithCoinKey {
  switch (token.coinKey) {
    case VIRTUAL_COIN_KEY: {
      token.logoURI = VIRTUAL_LOGO_URI;
      return token;
    }
    case USDG_COIN_KEY: {
      // LiFi has no logo for Arbitrum One USDG
      token.logoURI ||= USDG_LOGO_URI;
      return token;
    }
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
  tokensByChain: Record<number, LifiToken[]>;
  tokensByChainAndCoinKey: Record<number, Record<string, LifiTokenWithCoinKey>>;
}

const canonicalVirtual: LifiTokenWithCoinKey = {
  address: CommonAddress.RobinhoodChain.VIRTUAL_CANONICAL,
  chainId: ChainId.RobinhoodChain,
  coinKey: VIRTUAL_COIN_KEY,
  decimals: 18,
  name: 'Virtual Protocol',
  symbol: 'VIRTUAL',
};

function pickTokenFields({
  address,
  chainId,
  symbol,
  name,
  decimals,
  coinKey,
  logoURI,
  priceUSD,
}: LifiToken): LifiToken {
  return { address, chainId, symbol, name, decimals, coinKey, logoURI, priceUSD };
}

const fetchChainTokens = async (chainId: number): Promise<LifiToken[]> => {
  const response = await getTokens({ chains: [chainId as LiFiChainId] });

  if (!response.tokens) {
    return [];
  }

  const filteredTokens = (response.tokens[chainId] ?? []).reduce<LifiToken[]>((acc, token) => {
    // Exclude tokens on the exclude list
    if (isExcludedToken(token, chainId)) return acc;

    const tokenWithCoinKey = assignCustomCoinKey(token, chainId);
    if (!tokenWithCoinKey) {
      if (isListedUnmatchedToken(token, chainId)) {
        acc.push(pickTokenFields(token));
      }
      return acc;
    }

    const tokenWithLogoURI = assignLogoURI(tokenWithCoinKey);
    const normalizedToken = normalizeTokenMetadata(tokenWithLogoURI);

    acc.push(pickTokenFields(normalizedToken));
    return acc;
  }, []);

  if (chainId === ChainId.RobinhoodChain) {
    filteredTokens.push(canonicalVirtual);
  }

  return filteredTokens;
};

// One entry per chain: all chains together are over Next's 2 MB limit and would never be cached
const getCachedChainTokens = unstable_cache(fetchChainTokens, ['lifi-token-registry'], {
  revalidate: 30,
});

function hasCoinKey(token: LifiToken): token is LifiTokenWithCoinKey {
  return Boolean(token.coinKey);
}

/** First token per coinKey wins, except canonical VIRTUAL, which replaces LiFi's VIRTUAL */
function groupTokensByCoinKey(tokens: LifiToken[]): Record<string, LifiTokenWithCoinKey> {
  const tokensByCoinKey: Record<string, LifiTokenWithCoinKey> = {};

  for (const token of tokens) {
    if (!hasCoinKey(token)) continue;

    const isCanonicalVirtual =
      token.chainId === ChainId.RobinhoodChain &&
      addressesEqual(token.address, CommonAddress.RobinhoodChain.VIRTUAL_CANONICAL);
    if (isCanonicalVirtual) {
      tokensByCoinKey[token.coinKey] = token;
    } else {
      tokensByCoinKey[token.coinKey] ??= token;
    }
  }

  return tokensByCoinKey;
}

/** Reads the registry for the given chains. Chains that are not LiFi source chains are left out. */
export async function getLifiTokenRegistry(chainIds: number[]): Promise<LifiTokenRegistry> {
  const sourceChainIds = [...new Set(chainIds)].filter((chainId) =>
    allowedLifiSourceChainIds.includes(chainId),
  );
  // Pass only the chain id: unstable_cache keys on every argument
  const chainTokens = await Promise.all(
    sourceChainIds.map((chainId) => getCachedChainTokens(chainId)),
  );

  const registry: LifiTokenRegistry = { tokensByChain: {}, tokensByChainAndCoinKey: {} };
  sourceChainIds.forEach((chainId, index) => {
    const tokens = chainTokens[index] ?? [];
    registry.tokensByChain[chainId] = tokens;
    registry.tokensByChainAndCoinKey[chainId] = groupTokensByCoinKey(tokens);
  });

  return registry;
}
