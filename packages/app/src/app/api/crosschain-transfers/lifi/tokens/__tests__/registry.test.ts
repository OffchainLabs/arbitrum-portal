import { CoinKey, ChainId as LiFiChainId, type Token as LiFiToken } from '@lifi/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';
import { LIFI_TRANSFER_LIST_ID, tokenListTokenToBridgeToken } from '@/bridge/util/TokenListUtils';

import { groupChildTokensAndParentTokens } from '../groupChildTokensAndParentTokens';
import { getLifiTokenRegistry } from '../registry';

const { getTokens } = vi.hoisted(() => ({ getTokens: vi.fn() }));

vi.mock('@lifi/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@lifi/sdk')>()),
  getTokens,
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fetcher: () => unknown) => fetcher,
}));

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

    const registry = await getLifiTokenRegistry();
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

    const registry = await getLifiTokenRegistry();

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
