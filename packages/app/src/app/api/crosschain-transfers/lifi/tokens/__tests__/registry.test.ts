import { type Token as LiFiToken, getTokens } from '@lifi/sdk';
import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

import { getLifiTokenRegistry } from '../registry';

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

vi.mock('@lifi/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lifi/sdk')>();
  return { ...actual, getTokens: vi.fn() };
});

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

describe('getLifiTokenRegistry exclusions', () => {
  it('keeps a single USDG on Robinhood Chain and drops the duplicate, case-insensitively', async () => {
    vi.mocked(getTokens).mockResolvedValue({
      tokens: {
        [ChainId.RobinhoodChain]: [paxosUsdgDuplicate, globalDollarUsdg, unmatchedRobinhoodToken],
        [ChainId.ArbitrumOne]: [oldApeOnArbitrumOne],
      },
    } as unknown as Awaited<ReturnType<typeof getTokens>>);

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
