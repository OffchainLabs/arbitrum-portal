import { CoinKey, getConnections } from '@lifi/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

import { getRouteCandidates, getSwapRouteCandidates, getTokenId, searchTokens } from './graph';

const mockLifiRegistry = {
  tokensByChain: {} as Record<
    number,
    Array<{ address: string; coinKey: CoinKey; symbol: string; name: string; decimals: number }>
  >,
  tokensByChainAndCoinKey: {} as Record<
    number,
    Record<
      string,
      { address: string; coinKey: CoinKey; symbol: string; name: string; decimals: number }
    >
  >,
};

vi.mock('../../app/api/crosschain-transfers/lifi/tokens/registry', () => ({
  getLifiTokenRegistry: async () => mockLifiRegistry,
}));

vi.mock('@lifi/sdk', () => {
  const CoinKey = {
    ETH: 'ETH',
    APE: 'APE',
    USDC: 'USDC',
    USDCe: 'USDCe',
    USDT: 'USDT',
    WETH: 'WETH',
  } as const;

  return {
    CoinKey,
    getConnections: vi.fn(async () => ({ connections: [] })),
  };
});

describe('token graph destination tokens', () => {
  beforeEach(() => {
    mockLifiRegistry.tokensByChain = {};
    mockLifiRegistry.tokensByChainAndCoinKey = {};
    vi.mocked(getConnections).mockResolvedValue({ connections: [] });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          tokens: [
            {
              chainId: ChainId.Ethereum,
              address: CommonAddress.Ethereum.USDC,
              name: 'USD Coin',
              symbol: 'USDC',
              decimals: 6,
            },
            {
              chainId: ChainId.ArbitrumOne,
              address: CommonAddress.ArbitrumOne.USDC,
              name: 'USD Coin',
              symbol: 'USDC',
              decimals: 6,
            },
            {
              chainId: ChainId.Ethereum,
              address: '0x6b175474e89094c44da98b954eedeac495271d0f',
              name: 'Dai Stablecoin',
              symbol: 'DAI',
              decimals: 18,
            },
          ],
        }),
      }),
    );
  });

  it('returns direct routes first and loads lifi swap routes on demand', async () => {
    vi.mocked(getConnections).mockResolvedValue({
      connections: [
        {
          fromChainId: ChainId.Ethereum,
          toChainId: ChainId.ArbitrumOne,
          fromTokens: [],
          toTokens: [
            {
              chainId: ChainId.ArbitrumOne,
              address: CommonAddress.ArbitrumOne.USDC,
              name: 'USD Coin',
              symbol: 'USDC',
              decimals: 6,
              coinKey: CoinKey.USDC,
              logoURI: undefined,
              priceUSD: '1',
            },
            {
              chainId: ChainId.ArbitrumOne,
              address: '0x46850ad61c2b7d64d08c9c754f45254596696984',
              name: 'PayPal USD',
              symbol: 'PYUSD',
              decimals: 6,
              coinKey: 'PYUSD' as CoinKey,
              logoURI: undefined,
              priceUSD: '1',
            },
          ],
        },
      ],
    });

    const directResponse = await getRouteCandidates({
      sourceTokenId: getTokenId(ChainId.Ethereum, CommonAddress.Ethereum.USDC),
      destinationChainId: ChainId.ArbitrumOne,
    });

    expect(
      directResponse.items.map((item) => `${item.provider}:${item.destinationToken.id}`),
    ).toEqual([
      `cctp:${getTokenId(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne.USDC)}`,
      `canonical:${getTokenId(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne['USDC.e'])}`,
    ]);

    const swapFallbackResponse = await getSwapRouteCandidates({
      sourceTokenId: getTokenId(ChainId.Ethereum, CommonAddress.Ethereum.USDC),
      destinationChainId: ChainId.ArbitrumOne,
    });

    expect(
      swapFallbackResponse.items.map((item) => `${item.provider}:${item.destinationToken.id}`),
    ).toEqual([
      `lifi:${getTokenId(ChainId.ArbitrumOne, '0x46850ad61c2b7d64d08c9c754f45254596696984')}`,
    ]);
    expect(swapFallbackResponse.items.map((item) => item.routeId)).toEqual([
      `${getTokenId(ChainId.Ethereum, CommonAddress.Ethereum.USDC)}->${getTokenId(
        ChainId.ArbitrumOne,
        '0x46850ad61c2b7d64d08c9c754f45254596696984',
      )}:lifi-swap`,
    ]);
  });

  it('returns direct lifi and withdraw-only canonical routes for pyusd', async () => {
    const ethPyusdAddress = '0x6c3ea9036406852006290770bedfcaba0e23a0e8';
    const arbPyusdLifiAddress = '0x46850ad61c2b7d64d08c9c754f45254596696984';
    const arbPyusdWithdrawOnlyAddress = '0x327006c8712fe0abdbbd55b7999db39b0967342e';

    const ethToArbWithoutRegistry = await getRouteCandidates({
      sourceTokenId: getTokenId(ChainId.Ethereum, ethPyusdAddress),
      destinationChainId: ChainId.ArbitrumOne,
    });

    expect(ethToArbWithoutRegistry.items.map((item) => item.destinationToken.id)).toEqual([
      getTokenId(ChainId.ArbitrumOne, arbPyusdLifiAddress),
    ]);

    const ethLifiToken = {
      address: ethPyusdAddress,
      coinKey: 'PYUSD' as CoinKey,
      symbol: 'PYUSD',
      name: 'PayPal USD',
      decimals: 6,
    };
    const arbLifiToken = {
      address: arbPyusdLifiAddress,
      coinKey: 'PYUSD' as CoinKey,
      symbol: 'PYUSD',
      name: 'PayPal USD',
      decimals: 6,
    };

    mockLifiRegistry.tokensByChain = {
      [ChainId.Ethereum]: [ethLifiToken],
      [ChainId.ArbitrumOne]: [arbLifiToken],
    };
    mockLifiRegistry.tokensByChainAndCoinKey = {
      [ChainId.Ethereum]: { PYUSD: ethLifiToken },
      [ChainId.ArbitrumOne]: { PYUSD: arbLifiToken },
    };

    const ethToArb = await getRouteCandidates({
      sourceTokenId: getTokenId(ChainId.Ethereum, ethPyusdAddress),
      destinationChainId: ChainId.ArbitrumOne,
    });

    expect(ethToArb.items.map((item) => `${item.provider}:${item.destinationToken.id}`)).toEqual([
      `lifi:${getTokenId(ChainId.ArbitrumOne, arbPyusdLifiAddress)}`,
    ]);

    const arbToEth = await getRouteCandidates({
      sourceTokenId: getTokenId(ChainId.ArbitrumOne, arbPyusdWithdrawOnlyAddress),
      destinationChainId: ChainId.Ethereum,
    });

    expect(arbToEth.items.map((item) => `${item.provider}:${item.destinationToken.id}`)).toContain(
      `canonical:${getTokenId(ChainId.Ethereum, ethPyusdAddress)}`,
    );
  });

  it('includes lifi-only source tokens and asks destination to select token', async () => {
    const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';
    vi.mocked(getConnections).mockResolvedValue({
      connections: [
        {
          fromChainId: ChainId.Ethereum,
          toChainId: ChainId.ArbitrumOne,
          fromTokens: [
            {
              chainId: ChainId.Ethereum,
              address: daiAddress,
              name: 'Dai Stablecoin',
              symbol: 'DAI',
              decimals: 18,
              coinKey: 'DAI' as CoinKey,
              logoURI: undefined,
              priceUSD: '1',
            },
          ],
          toTokens: [
            {
              chainId: ChainId.ArbitrumOne,
              address: CommonAddress.ArbitrumOne.USDC,
              name: 'USD Coin',
              symbol: 'USDC',
              decimals: 6,
              coinKey: CoinKey.USDC,
              logoURI: undefined,
              priceUSD: '1',
            },
          ],
        },
      ],
    });

    const searchableSourceTokens = await searchTokens({
      chainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne,
    });

    expect(searchableSourceTokens.items.map((item) => item.id)).toContain(
      getTokenId(ChainId.Ethereum, daiAddress),
    );

    const destinationResponse = await getRouteCandidates({
      sourceTokenId: getTokenId(ChainId.Ethereum, daiAddress),
      destinationChainId: ChainId.ArbitrumOne,
    });

    expect(destinationResponse.items).toHaveLength(0);

    const swapFallbackResponse = await getSwapRouteCandidates({
      sourceTokenId: getTokenId(ChainId.Ethereum, daiAddress),
      destinationChainId: ChainId.ArbitrumOne,
    });

    expect(swapFallbackResponse.items.map((item) => item.destinationToken.id)).toEqual([
      getTokenId(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne.USDC),
    ]);
    expect(swapFallbackResponse.items.every((item) => item.routeId.endsWith(':lifi-swap'))).toBe(true);
  });

  it('filters out lifi-only source tokens when lifi has no reachable destination', async () => {
    const searchableSourceTokens = await searchTokens({
      chainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne,
    });

    expect(searchableSourceTokens.items.map((item) => item.symbol)).not.toContain('DAI');
  });
});
