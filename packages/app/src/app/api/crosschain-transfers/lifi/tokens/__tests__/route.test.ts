import { CoinKey, ChainId as LiFiChainId, type Token as LiFiToken } from '@lifi/sdk';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';

import { getLifiTokenRegistry } from '../registry';
import { GET } from '../route';

vi.mock('../registry', () => ({
  getLifiTokenRegistry: vi.fn(),
}));

function buildToken(overrides: Partial<LiFiToken>): LiFiToken {
  return {
    address: '0x0000000000000000000000000000000000000001',
    chainId: LiFiChainId.ARB,
    coinKey: CoinKey.ETH,
    decimals: 18,
    name: 'Token',
    priceUSD: '1',
    symbol: 'TOKEN',
    ...overrides,
  };
}

function buildRequest({
  parentChainId,
  childChainId,
}: {
  parentChainId: number;
  childChainId: number;
}) {
  return new NextRequest(
    `http://localhost/api/crosschain-transfers/lifi/tokens?parentChainId=${parentChainId}&childChainId=${childChainId}`,
  );
}

describe('LiFi token-list route', () => {
  const mockedGetLifiTokenRegistry = vi.mocked(getLifiTokenRegistry);
  const robinhoodToken = buildToken({
    address: '0x0000000000000000000000000000000000000300',
    chainId: ChainId.RobinhoodChain as unknown as LiFiChainId,
    coinKey: undefined,
    name: 'Robinhood Stock Token',
    symbol: 'STOCK',
  });

  beforeEach(() => {
    mockedGetLifiTokenRegistry.mockResolvedValue({
      unpairedTokensByChain: {
        [ChainId.RobinhoodChain]: [robinhoodToken],
      },
      tokensByChain: {},
      tokensByChainAndCoinKey: {},
    });
  });

  it('does not expose unpaired tokens when their chain is the destination', async () => {
    const response = await GET(
      buildRequest({
        parentChainId: ChainId.Ethereum,
        childChainId: ChainId.RobinhoodChain,
      }),
    );
    const body = await response.json();

    expect(body.tokens).toEqual([]);
  });

  it('adds enabled unpaired tokens as source-side entries', async () => {
    const response = await GET(
      buildRequest({
        parentChainId: ChainId.RobinhoodChain,
        childChainId: ChainId.Ethereum,
      }),
    );
    const body = await response.json();

    expect(body.tokens).toEqual([
      expect.objectContaining({
        address: robinhoodToken.address,
        chainId: ChainId.RobinhoodChain,
      }),
    ]);
    expect(body.tokens[0]?.extensions?.bridgeInfo).toBeUndefined();
  });
});
