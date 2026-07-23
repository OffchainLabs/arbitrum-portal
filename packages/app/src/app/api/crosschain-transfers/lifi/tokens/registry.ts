import { CoinKey, ChainId as LiFiChainId, type Token as LiFiToken, getTokens } from '@lifi/sdk';
import { unstable_cache } from 'next/cache';

import {
  allowedLifiSourceChainIds,
  lifiDestinationChainIds,
} from '@/bridge/app/api/crosschain-transfers/constants';
import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

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

// LiFi returns extra metadata (e.g. verification status breakdowns) that nothing downstream reads
function toSlimToken(token: LifiTokenWithCoinKey): LifiTokenWithCoinKey {
  return {
    chainId: token.chainId,
    address: token.address,
    symbol: token.symbol,
    decimals: token.decimals,
    name: token.name,
    coinKey: token.coinKey,
    logoURI: token.logoURI,
    priceUSD: token.priceUSD,
  };
}

// Chains reachable from each chain, in either direction
const PARTNER_CHAIN_IDS: Record<number, Set<number>> = {};
for (const [sourceChainId, destinationChainIds] of Object.entries(lifiDestinationChainIds)) {
  const sourceChainIdNum = Number(sourceChainId);
  for (const destinationChainId of destinationChainIds) {
    (PARTNER_CHAIN_IDS[sourceChainIdNum] ??= new Set()).add(destinationChainId);
    (PARTNER_CHAIN_IDS[destinationChainId] ??= new Set()).add(sourceChainIdNum);
  }
}

/**
 * Tokens are matched across chains by coinKey (see groupChildTokensAndParentTokens),
 * so a token whose coinKey doesn't exist on any partner chain can never appear
 * in a route and only bloats the cache. LiFi returns thousands of such tokens
 * (e.g. Ethereum-only meme tokens).
 */
function keepRoutableTokens(
  tokensByChain: LifiTokenRegistry['tokensByChain'],
): LifiTokenRegistry['tokensByChain'] {
  const coinKeysByChain: Record<number, Set<CoinKey>> = {};
  for (const chainId of allowedLifiSourceChainIds) {
    coinKeysByChain[chainId] = new Set(
      (tokensByChain[chainId] ?? []).map((token) => token.coinKey),
    );
  }

  const routableTokensByChain: LifiTokenRegistry['tokensByChain'] = {};

  for (const chainId of allowedLifiSourceChainIds) {
    const partnerCoinKeys = new Set<CoinKey>();
    for (const partnerChainId of PARTNER_CHAIN_IDS[chainId] ?? []) {
      for (const coinKey of coinKeysByChain[partnerChainId] ?? []) {
        partnerCoinKeys.add(coinKey);
      }

      // ETH on a parent chain routes to WETH on ApeChain (see groupChildTokensAndParentTokens)
      if (
        partnerChainId === ChainId.ApeChain &&
        coinKeysByChain[partnerChainId]?.has(CoinKey.WETH)
      ) {
        partnerCoinKeys.add(CoinKey.ETH);
      }
    }

    if (chainId === ChainId.ApeChain && partnerCoinKeys.has(CoinKey.ETH)) {
      partnerCoinKeys.add(CoinKey.WETH);
    }

    routableTokensByChain[chainId] = (tokensByChain[chainId] ?? []).filter((token) =>
      partnerCoinKeys.has(token.coinKey),
    );
  }

  return routableTokensByChain;
}

const fetchTokensByChain = async (): Promise<LifiTokenRegistry['tokensByChain']> => {
  const response = await getTokens({
    chains: allowedLifiSourceChainIds as unknown as LiFiChainId[],
  });

  if (!response.tokens) {
    return {};
  }

  const tokensByChain: LifiTokenRegistry['tokensByChain'] = {};

  for (const chainId of allowedLifiSourceChainIds) {
    tokensByChain[chainId] = (response.tokens[chainId] ?? []).reduce<LifiTokenWithCoinKey[]>(
      (acc, token) => {
        // Exclude tokens on the exclude list
        if (isExcludedToken(token, chainId)) return acc;

        const tokenWithCoinKey = assignCustomCoinKey(token, chainId);
        if (!tokenWithCoinKey) return acc;

        const tokenWithLogoURI = assignLogoURI(tokenWithCoinKey);
        const normalizedToken = normalizeTokenMetadata(tokenWithLogoURI);

        acc.push(toSlimToken(normalizedToken));
        return acc;
      },
      [],
    );
  }

  return keepRoutableTokens(tokensByChain);
};

/**
 * The serialized value must stay under Next.js' 2MB unstable_cache item limit,
 * otherwise every cache write fails and every request refetches from LiFi.
 * So we cache only the slimmed per-chain token arrays and rebuild the
 * coinKey lookup (which duplicates almost every token) on read.
 */
const getCachedTokensByChain = unstable_cache(fetchTokensByChain, ['lifi-tokens-by-chain'], {
  revalidate: 30,
});

export async function getLifiTokenRegistry(): Promise<LifiTokenRegistry> {
  const tokensByChain = await getCachedTokensByChain();

  const tokensByChainAndCoinKey: LifiTokenRegistry['tokensByChainAndCoinKey'] = {};

  for (const chainId of allowedLifiSourceChainIds) {
    const tokensGroupedByCoinKey: Partial<Record<CoinKey, LifiTokenWithCoinKey>> = {};

    for (const token of tokensByChain[chainId] ?? []) {
      tokensGroupedByCoinKey[token.coinKey] ??= token;
    }

    tokensByChainAndCoinKey[chainId] = tokensGroupedByCoinKey;
  }

  return { tokensByChain, tokensByChainAndCoinKey };
}
