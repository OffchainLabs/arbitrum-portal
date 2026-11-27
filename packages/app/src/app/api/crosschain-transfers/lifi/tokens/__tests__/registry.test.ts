import { CoinKey, ChainId as LiFiChainId, type Token as LiFiToken } from '@lifi/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';
import {
  LIFI_TRANSFER_LIST_ID,
  isTokenAvailableOnChain,
  tokenListTokenToBridgeToken,
} from '@/bridge/util/TokenListUtils';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '@/bridge/wallet/ecosystems/solana';

import { groupChildTokensAndParentTokens } from '../groupChildTokensAndParentTokens';
import { getLifiTokenRegistry } from '../registry';

const solanaFlag = vi.hoisted(() => ({ isEnabled: true }));

vi.mock('@/bridge/wallet/ecosystems/solana', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/bridge/wallet/ecosystems/solana')>();
  actual.solanaEcosystem.isEnabled = () => solanaFlag.isEnabled;
  return actual;
});

const { getTokens } = vi.hoisted(() => ({ getTokens: vi.fn() }));

vi.mock('@lifi/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@lifi/sdk')>()),
  getTokens,
}));

// In-memory stand-in for Next's data cache, keyed like `unstable_cache`: key parts plus arguments
const { cacheEntries } = vi.hoisted(() => ({
  cacheEntries: new Map<string, { keyParts: string[]; result: unknown }>(),
}));

vi.mock('next/cache', () => ({
  unstable_cache:
    (fetcher: (...args: unknown[]) => Promise<unknown>, keyParts: string[]) =>
    async (...args: unknown[]) => {
      const key = `${keyParts.join(',')}-${JSON.stringify(args)}`;
      const entry = cacheEntries.get(key);
      if (entry) {
        return JSON.parse(JSON.stringify(entry.result));
      }
      const result = await fetcher(...args);
      cacheEntries.set(key, { keyParts, result });
      return result;
    },
}));

beforeEach(() => {
  cacheEntries.clear();
});

// Same measure as Next's data cache, which skips entries over 2 MB
function nextCacheEntrySize(result: unknown): number {
  return JSON.stringify({
    kind: 'FETCH',
    data: { headers: {}, body: JSON.stringify(result), status: 200, url: '' },
    revalidate: 30,
  }).length;
}

function virtualToken(address: string, chainId: number, coinKey?: CoinKey): LiFiToken {
  return {
    address,
    chainId: chainId as LiFiChainId,
    coinKey,
    decimals: 18,
    logoURI: '',
    name: 'Virtual Protocol',
    priceUSD: '1',
    symbol: 'VIRTUAL',
  };
}

// LiFi's API returns `verificationStatus`, but its SDK `Token` type leaves it out
function withVerificationStatus(token: LiFiToken, verificationStatus: string): LiFiToken {
  return Object.assign(token, { verificationStatus });
}

// LiFi's own ChainId and CoinKey enums do not include Robinhood Chain, so build through unknown
function buildLifiToken(overrides: {
  address: string;
  name: string;
  symbol: string;
  chainId?: number;
}): LiFiToken {
  return {
    decimals: 6,
    priceUSD: '1',
    chainId: ChainId.RobinhoodChain,
    logoURI: 'https://example.com/logo.png',
    ...overrides,
  } as unknown as LiFiToken;
}

// LiFi returns two tokens with the USDG symbol on Robinhood Chain. Neither carries a coinKey here:
// the live one gets `USDG` from CUSTOM_TOKENS, the duplicate must be dropped before that step.
const paxosUsdgDuplicate = buildLifiToken({
  // checksummed on purpose: exclusion must be case-insensitive
  address: '0x0A3B763d66c0e8c7555c986A3701E1DC1Bf3954F',
  name: 'Paxos USDG',
  symbol: 'USDG',
});
const globalDollarUsdg = buildLifiToken({
  address: CommonAddress.RobinhoodChain.USDG,
  name: 'USDG',
  symbol: 'USDG',
});
const unmatchedRobinhoodToken = buildLifiToken({
  address: '0x0000000000000000000000000000000000004663',
  name: 'Robinhood-only token',
  symbol: 'RHOOD',
});
const oldApeOnArbitrumOne = buildLifiToken({
  address: '0x74885b4d524d497261259b38900f54e6dbad2210',
  name: 'Old Ape',
  symbol: 'APE',
  chainId: ChainId.ArbitrumOne,
});

describe('getLifiTokenRegistry', () => {
  beforeEach(() => {
    getTokens.mockReset();
  });

  it('keeps Solana tokens beyond SOL and stablecoins', async () => {
    const supportedTokens = [
      virtualToken(SOLANA_NATIVE_TOKEN_ADDRESS, ChainId.Solana, CoinKey.SOL),
      virtualToken(CommonAddress.Solana.USDC, ChainId.Solana, CoinKey.USDC),
      virtualToken(CommonAddress.Solana.USDT, ChainId.Solana, CoinKey.USDT),
    ];
    const additionalToken = virtualToken(
      'XsQAm7K8RQuTg4BXy9qfXUxqHkHRwLNxikbRfn9kw4w',
      ChainId.Solana,
      CoinKey.ETH,
    );
    getTokens.mockResolvedValue({
      tokens: {
        [ChainId.Solana]: [...supportedTokens, additionalToken],
      },
    });

    const registry = await getLifiTokenRegistry([ChainId.Solana]);

    expect(registry.tokensByChain[ChainId.Solana]?.map((token) => token.address)).toEqual(
      [...supportedTokens, additionalToken].map((token) => token.address),
    );
  });

  it('drops HYPE at the zero address and keeps unverified Elysium-only tokens', async () => {
    const hype = withVerificationStatus(
      buildLifiToken({
        address: '0x0000000000000000000000000000000000000000',
        name: 'HYPE',
        symbol: 'HYPE',
        chainId: ChainId.Elysium,
      }),
      'unverified',
    );
    const kHype = withVerificationStatus(
      buildLifiToken({
        address: '0x248888D396A546A69A188f3Deb476964e581E9d0',
        name: 'Kinetiq Staked HYPE',
        symbol: 'kHYPE',
        chainId: ChainId.Elysium,
      }),
      'unverified',
    );
    getTokens.mockResolvedValue({ tokens: { [ChainId.Elysium]: [hype, kHype] } });

    const registry = await getLifiTokenRegistry([ChainId.Elysium]);

    expect(registry.tokensByChain[ChainId.Elysium]?.map((token) => token.symbol)).toEqual([
      'kHYPE',
    ]);
  });

  it('retains an unmatched Solana mint through registry, grouping, and selection', async () => {
    const solanaMint = virtualToken('XsQAm7K8RQuTg4BXy9qfXUxqHkHRwLNxikbRfn9kw4w', ChainId.Solana);
    const unmatched = withVerificationStatus({ ...solanaMint }, 'verified');
    getTokens.mockResolvedValue({ tokens: { [ChainId.Solana]: [unmatched] } });

    const registry = await getLifiTokenRegistry([ChainId.Solana]);
    // The registry keeps only the fields the route reads, so verificationStatus is dropped
    expect(registry.tokensByChain[ChainId.Solana]).toEqual([solanaMint]);
    expect(registry.tokensByChainAndCoinKey[ChainId.Solana]).toEqual({});
    const entries = groupChildTokensAndParentTokens({
      parentTokens: registry.tokensByChain[ChainId.Solana] ?? [],
      childTokens: [],
      childTokensByCoinKey: {},
      parentChainId: ChainId.Solana,
      childChainId: ChainId.ArbitrumOne,
    });
    const entry = entries[0];
    if (!entry) throw new Error('Expected unmatched Solana token');
    expect(entry.extensions?.bridgeInfo).toBeUndefined();
    const bridgeToken = tokenListTokenToBridgeToken({
      token: entry,
      listId: LIFI_TRANSFER_LIST_ID,
      parentChainId: ChainId.Solana,
      childChainId: ChainId.ArbitrumOne,
    });
    expect(bridgeToken?.lifiOnlyChainId).toBe(ChainId.Solana);
    expect(isTokenAvailableOnChain(bridgeToken, ChainId.Solana)).toBe(true);
    expect(isTokenAvailableOnChain(bridgeToken, ChainId.ArbitrumOne)).toBe(false);
  });

  it('lists only verified Solana tokens among those without a coinKey', async () => {
    const unverifiedSol = withVerificationStatus(
      virtualToken(SOLANA_NATIVE_TOKEN_ADDRESS, ChainId.Solana, CoinKey.SOL),
      'unverified',
    );
    const verified = withVerificationStatus(
      virtualToken('XsQAm7K8RQuTg4BXy9qfXUxqHkHRwLNxikbRfn9kw4w', ChainId.Solana),
      'verified',
    );
    const unverified = withVerificationStatus(
      virtualToken('Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg', ChainId.Solana),
      'unverified',
    );
    const flagged = withVerificationStatus(
      virtualToken('XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W', ChainId.Solana),
      'flagged',
    );
    const withoutStatus = virtualToken(
      'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp',
      ChainId.Solana,
    );
    const unverifiedRobinhoodToken = withVerificationStatus(
      buildLifiToken({
        address: '0x0000000000000000000000000000000000004664',
        name: 'Unverified Robinhood token',
        symbol: 'RHOODU',
      }),
      'unverified',
    );
    getTokens.mockResolvedValue({
      tokens: {
        [ChainId.Solana]: [unverifiedSol, verified, unverified, flagged, withoutStatus],
        [ChainId.RobinhoodChain]: [unverifiedRobinhoodToken],
      },
    });

    const registry = await getLifiTokenRegistry([ChainId.Solana, ChainId.RobinhoodChain]);

    expect(registry.tokensByChain[ChainId.Solana]?.map((token) => token.address)).toEqual([
      unverifiedSol.address,
      verified.address,
    ]);
    // Other chains that allow unmatched tokens keep them whatever their status
    expect(registry.tokensByChain[ChainId.RobinhoodChain]?.map((token) => token.symbol)).toContain(
      'RHOODU',
    );
  });

  it('keeps an allowlisted token without a coinKey through registry, grouping, and selection', async () => {
    const baseUsdc: LiFiToken = {
      address: CommonAddress.Base.USDC.toUpperCase(),
      chainId: LiFiChainId.BAS,
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      priceUSD: '1',
    };
    const unlistedToken = {
      ...baseUsdc,
      address: '0x0000000000000000000000000000000000000001',
    };
    getTokens.mockResolvedValue({
      tokens: {
        [ChainId.Base]: [baseUsdc, unlistedToken],
        [ChainId.Ethereum]: [{ ...baseUsdc, chainId: LiFiChainId.ETH }],
      },
    });

    const registry = await getLifiTokenRegistry([
      ChainId.Base,
      ChainId.Ethereum,
      ChainId.ArbitrumOne,
    ]);

    expect(registry.tokensByChain[ChainId.Base]).toEqual([baseUsdc]);
    expect(registry.tokensByChain[ChainId.Ethereum]).toEqual([]);
    expect(registry.tokensByChainAndCoinKey[ChainId.Base]).toEqual({});

    const tokens = groupChildTokensAndParentTokens({
      parentTokens: registry.tokensByChain[ChainId.Base] ?? [],
      childTokens: registry.tokensByChain[ChainId.ArbitrumOne] ?? [],
      childTokensByCoinKey: registry.tokensByChainAndCoinKey[ChainId.ArbitrumOne] ?? {},
      parentChainId: ChainId.Base,
      childChainId: ChainId.ArbitrumOne,
    });
    expect(tokens).toHaveLength(1);
    const entry = tokens[0];
    if (!entry) throw new Error('Expected unmatched Base USDC');
    expect(entry.extensions?.bridgeInfo).toBeUndefined();

    const bridgeToken = tokenListTokenToBridgeToken({
      token: entry,
      listId: LIFI_TRANSFER_LIST_ID,
      parentChainId: ChainId.Base,
      childChainId: ChainId.ArbitrumOne,
    });
    expect(bridgeToken?.lifiOnlyChainId).toBe(ChainId.Base);
    expect(isTokenAvailableOnChain(bridgeToken, ChainId.Base)).toBe(true);
    expect(isTokenAvailableOnChain(bridgeToken, ChainId.ArbitrumOne)).toBe(false);
  });

  it('adds canonical VIRTUAL separately when LiFi only returns the regular token', async () => {
    const virtualLogo =
      'https://static.debank.com/image/eth_token/logo_url/0x44ff8620b8ca30902395a7bd3f2407e1a091bf73/cbb70834d9442214c846833e47648255.png';
    const ethereumVirtual = {
      ...virtualToken(CommonAddress.Ethereum.VIRTUAL, ChainId.Ethereum),
      logoURI: virtualLogo,
    };
    const regularVirtual = {
      ...virtualToken(CommonAddress.RobinhoodChain.VIRTUAL, ChainId.RobinhoodChain),
      logoURI: undefined,
    };
    getTokens.mockResolvedValue({
      tokens: {
        [ChainId.Ethereum]: [ethereumVirtual],
        [ChainId.RobinhoodChain]: [regularVirtual],
      },
    });

    const registry = await getLifiTokenRegistry([ChainId.Ethereum, ChainId.RobinhoodChain]);
    const tokens = groupChildTokensAndParentTokens({
      parentTokens: registry.tokensByChain[ChainId.Ethereum] ?? [],
      childTokens: registry.tokensByChain[ChainId.RobinhoodChain] ?? [],
      childTokensByCoinKey: registry.tokensByChainAndCoinKey[ChainId.RobinhoodChain] ?? {},
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.RobinhoodChain,
    });

    expect(registry.tokensByChain[ChainId.RobinhoodChain]).toEqual([
      { ...regularVirtual, coinKey: 'VIRTUAL', logoURI: virtualLogo },
      {
        address: CommonAddress.RobinhoodChain.VIRTUAL_CANONICAL,
        chainId: ChainId.RobinhoodChain,
        coinKey: 'VIRTUAL',
        decimals: 18,
        name: 'Virtual Protocol',
        symbol: 'VIRTUAL',
      },
    ]);
    expect(tokens).toEqual([
      expect.objectContaining({
        address: CommonAddress.RobinhoodChain.VIRTUAL_CANONICAL,
        logoURI: virtualLogo,
        extensions: expect.objectContaining({
          bridgeInfo: {
            [ChainId.Ethereum]: expect.objectContaining({
              tokenAddress: CommonAddress.Ethereum.VIRTUAL,
            }),
          },
        }),
      }),
      expect.objectContaining({
        address: CommonAddress.RobinhoodChain.VIRTUAL,
        logoURI: virtualLogo,
        extensions: expect.not.objectContaining({
          bridgeInfo: expect.anything(),
        }),
      }),
    ]);

    const canonicalToken = tokens[0];
    const lifiToken = tokens[1];
    expect(canonicalToken).toBeDefined();
    expect(lifiToken).toBeDefined();
    if (!canonicalToken || !lifiToken) return;

    expect(canonicalToken.extensions).not.toHaveProperty('priceUSD');
    expect(lifiToken.extensions).toHaveProperty('priceUSD', regularVirtual.priceUSD);

    expect(
      tokenListTokenToBridgeToken({
        token: canonicalToken,
        listId: LIFI_TRANSFER_LIST_ID,
        parentChainId: ChainId.Ethereum,
        childChainId: ChainId.RobinhoodChain,
      }),
    ).toEqual(
      expect.objectContaining({
        address: CommonAddress.Ethereum.VIRTUAL,
        l2Address: CommonAddress.RobinhoodChain.VIRTUAL_CANONICAL,
        logoURI: virtualLogo,
      }),
    );
    expect(
      tokenListTokenToBridgeToken({
        token: lifiToken,
        listId: LIFI_TRANSFER_LIST_ID,
        parentChainId: ChainId.Ethereum,
        childChainId: ChainId.RobinhoodChain,
      }),
    ).toEqual(
      expect.objectContaining({
        address: CommonAddress.RobinhoodChain.VIRTUAL,
        l2Address: CommonAddress.RobinhoodChain.VIRTUAL,
        lifiOnlyChainId: ChainId.RobinhoodChain,
        logoURI: virtualLogo,
      }),
    );
  });
});

describe('getLifiTokenRegistry caching', () => {
  beforeEach(() => {
    getTokens.mockReset();
  });

  it('fetches each requested chain once and reuses it across requests', async () => {
    getTokens.mockResolvedValue({ tokens: {} });
    const requestedChains = () => getTokens.mock.calls.map(([options]) => options.chains);

    await getLifiTokenRegistry([ChainId.Ethereum, ChainId.ArbitrumOne, ChainId.Ethereum]);
    expect(requestedChains()).toEqual([[ChainId.Ethereum], [ChainId.ArbitrumOne]]);

    await getLifiTokenRegistry([ChainId.Ethereum, ChainId.ArbitrumOne]);
    expect(requestedChains()).toHaveLength(2);

    await getLifiTokenRegistry([ChainId.Ethereum, ChainId.RobinhoodChain]);
    expect(requestedChains()).toEqual([
      [ChainId.Ethereum],
      [ChainId.ArbitrumOne],
      [ChainId.RobinhoodChain],
    ]);
  });

  it('keeps each per-chain cache entry under 2 MiB for a full LiFi token list', async () => {
    // Worst case: LiFi verifies every Solana token, so Solana keeps all of them. Field lengths
    // follow LiFi's Solana list from November 2026: 5,824 tokens, almost none with a coinKey.
    const solanaTokens = Array.from({ length: 6_000 }, (_, index) => {
      const symbol = `TKN${index}x`;
      return {
        address: `So1ana${String(index).padStart(38, '0')}`,
        chainId: ChainId.Solana,
        symbol,
        name: `Token ${index} PP Variable xStock`,
        decimals: 8,
        priceUSD: '107.34453773415345',
        logoURI: `https://xstocks-metadata.backed.fi/logos/tokens/${symbol}.png`,
        verificationStatus: 'verified',
        verificationStatusBreakdown: [
          { provider: 'hypernative', result: 'verified', providerResult: 'accept' },
        ],
      } as unknown as LiFiToken;
    });
    getTokens.mockResolvedValue({ tokens: { [ChainId.Solana]: solanaTokens } });
    // The list as LiFi returns it would not fit
    expect(nextCacheEntrySize(solanaTokens)).toBeGreaterThan(2 * 1024 * 1024);

    const registry = await getLifiTokenRegistry([ChainId.Solana]);

    expect(registry.tokensByChain[ChainId.Solana]).toHaveLength(6_000);
    expect(registry.tokensByChain[ChainId.Solana]?.[0]).toEqual({
      address: solanaTokens[0]?.address,
      chainId: ChainId.Solana,
      symbol: 'TKN0x',
      name: 'Token 0 PP Variable xStock',
      decimals: 8,
      priceUSD: '107.34453773415345',
      logoURI: 'https://xstocks-metadata.backed.fi/logos/tokens/TKN0x.png',
    });
    const entries = [...cacheEntries.values()];
    expect(entries).toHaveLength(1);
    expect(nextCacheEntrySize(entries[0]?.result)).toBeLessThan(2 * 1024 * 1024);
  });
});

describe('getLifiTokenRegistry exclusions', () => {
  beforeEach(() => {
    getTokens.mockReset();
  });

  it('keeps a single USDG on Robinhood Chain and drops the duplicate, case-insensitively', async () => {
    getTokens.mockResolvedValue({
      tokens: {
        [ChainId.RobinhoodChain]: [paxosUsdgDuplicate, globalDollarUsdg, unmatchedRobinhoodToken],
        [ChainId.ArbitrumOne]: [oldApeOnArbitrumOne],
      },
    });

    const registry = await getLifiTokenRegistry([ChainId.RobinhoodChain, ChainId.ArbitrumOne]);

    const robinhoodTokens = registry.tokensByChain[ChainId.RobinhoodChain] ?? [];
    const robinhoodUsdg = robinhoodTokens.filter((token) => token.symbol === 'USDG');
    expect(robinhoodUsdg).toHaveLength(1);
    expect(robinhoodUsdg[0]?.address.toLowerCase()).toBe(CommonAddress.RobinhoodChain.USDG);
    expect(
      registry.tokensByChainAndCoinKey[ChainId.RobinhoodChain]?.USDG?.address.toLowerCase(),
    ).toBe(CommonAddress.RobinhoodChain.USDG);

    // Robinhood opts in to unmatched LiFi tokens; exclusion must not swallow them
    expect(robinhoodTokens.map((token) => token.symbol)).toContain('RHOOD');

    // the exclusion list is per chain and already covers Arbitrum One
    expect(registry.tokensByChain[ChainId.ArbitrumOne]).toEqual([]);
  });
});

describe('getLifiTokenRegistry USDG pairing', () => {
  beforeEach(() => {
    getTokens.mockReset();
  });

  it('pairs the natively issued Arbitrum One USDG, which LiFi lists without a coinKey', async () => {
    const ethereumUsdg = {
      ...buildLifiToken({
        address: CommonAddress.Ethereum.USDG,
        name: 'Global Dollar',
        symbol: 'USDG',
        chainId: ChainId.Ethereum,
      }),
      coinKey: 'USDG' as CoinKey,
    } as LiFiToken;
    const arbitrumOneUsdg = buildLifiToken({
      address: CommonAddress.ArbitrumOne.USDG,
      name: 'Global Dollar',
      symbol: 'USDG',
      chainId: ChainId.ArbitrumOne,
    });
    getTokens.mockResolvedValue({
      tokens: {
        [ChainId.Ethereum]: [ethereumUsdg],
        [ChainId.ArbitrumOne]: [arbitrumOneUsdg],
      },
    });

    const registry = await getLifiTokenRegistry([ChainId.Ethereum, ChainId.ArbitrumOne]);
    const tokens = groupChildTokensAndParentTokens({
      parentTokens: registry.tokensByChain[ChainId.Ethereum] ?? [],
      childTokens: registry.tokensByChain[ChainId.ArbitrumOne] ?? [],
      childTokensByCoinKey: registry.tokensByChainAndCoinKey[ChainId.ArbitrumOne] ?? {},
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne,
    });

    expect(tokens).toEqual([
      expect.objectContaining({
        address: CommonAddress.ArbitrumOne.USDG,
        extensions: expect.objectContaining({
          bridgeInfo: {
            [ChainId.Ethereum]: expect.objectContaining({
              tokenAddress: CommonAddress.Ethereum.USDG,
            }),
          },
        }),
      }),
    ]);
  });

  it.each([undefined, ''])(
    'hardcodes the USDG logo when the LiFi logo is %j, and keeps the LiFi one otherwise',
    async (lifiLogo) => {
      const usdgLogo =
        'https://static.debank.com/image/eth_token/logo_url/0xe343167631d89b6ffc58b88d6b7fb0228795491d/4cbeae5d28b9db12bcf655fae7a328bb.png';
      getTokens.mockResolvedValue({
        tokens: {
          [ChainId.Ethereum]: [
            buildLifiToken({
              address: CommonAddress.Ethereum.USDG,
              name: 'Global Dollar',
              symbol: 'USDG',
              chainId: ChainId.Ethereum,
            }),
          ],
          [ChainId.ArbitrumOne]: [
            {
              ...buildLifiToken({
                address: CommonAddress.ArbitrumOne.USDG,
                name: 'Global Dollar',
                symbol: 'USDG',
                chainId: ChainId.ArbitrumOne,
              }),
              logoURI: lifiLogo,
            },
          ],
        },
      });

      const registry = await getLifiTokenRegistry([ChainId.Ethereum, ChainId.ArbitrumOne]);

      expect(registry.tokensByChain[ChainId.Ethereum]?.[0]?.logoURI).toBe(
        'https://example.com/logo.png',
      );
      expect(registry.tokensByChain[ChainId.ArbitrumOne]?.[0]?.logoURI).toBe(usdgLogo);
    },
  );
});

describe.sequential('getLifiTokenRegistry with the Solana flag off', () => {
  beforeEach(() => {
    getTokens.mockReset();
  });

  it('neither requests nor returns Solana tokens', async () => {
    solanaFlag.isEnabled = false;
    try {
      // The LiFi source chains read the flag when `constants.ts` loads
      vi.resetModules();
      const { getLifiTokenRegistry: getRegistryWithFlagOff } = await import('../registry');
      getTokens.mockResolvedValue({
        tokens: {
          [ChainId.Solana]: [
            virtualToken(SOLANA_NATIVE_TOKEN_ADDRESS, ChainId.Solana, CoinKey.SOL),
          ],
        },
      });

      const registry = await getRegistryWithFlagOff([ChainId.Solana, ChainId.ArbitrumOne]);

      expect(getTokens).toHaveBeenCalledTimes(1);
      expect(getTokens.mock.calls[0]?.[0].chains).toEqual([ChainId.ArbitrumOne]);
      expect(registry.tokensByChain[ChainId.Solana]).toBeUndefined();
      expect(registry.tokensByChainAndCoinKey[ChainId.Solana]).toBeUndefined();
    } finally {
      solanaFlag.isEnabled = true;
      vi.resetModules();
    }
  });
});
