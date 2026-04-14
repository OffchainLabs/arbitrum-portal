import { CoinKey } from '@lifi/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

import { getRouteCandidates, getTokenId, searchTokens } from './graph';

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

describe('token graph destination tokens', () => {
  beforeEach(() => {
    mockLifiRegistry.tokensByChain = {};
    mockLifiRegistry.tokensByChainAndCoinKey = {};

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

    const swapFallbackResponse = await getRouteCandidates({
      sourceTokenId: getTokenId(ChainId.Ethereum, CommonAddress.Ethereum.USDC),
      destinationChainId: ChainId.ArbitrumOne,
      includeSwapFallback: true,
    });

    expect(
      swapFallbackResponse.items.map((item) => `${item.provider}:${item.destinationToken.id}`),
    ).toEqual([
      `cctp:${getTokenId(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne.USDC)}`,
      `canonical:${getTokenId(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne['USDC.e'])}`,
      `lifi:${getTokenId(ChainId.ArbitrumOne, '0x46850ad61c2b7d64d08c9c754f45254596696984')}`,
      `lifi:${getTokenId(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne.USDC)}`,
    ]);
    expect(swapFallbackResponse.items.map((item) => item.routeId)).toEqual([
      `${getTokenId(ChainId.Ethereum, CommonAddress.Ethereum.USDC)}->${getTokenId(
        ChainId.ArbitrumOne,
        CommonAddress.ArbitrumOne.USDC,
      )}:cctp`,
      `${getTokenId(ChainId.Ethereum, CommonAddress.Ethereum.USDC)}->${getTokenId(
        ChainId.ArbitrumOne,
        CommonAddress.ArbitrumOne['USDC.e'],
      )}:canonical`,
      `${getTokenId(ChainId.Ethereum, CommonAddress.Ethereum.USDC)}->${getTokenId(
        ChainId.ArbitrumOne,
        '0x46850ad61c2b7d64d08c9c754f45254596696984',
      )}:lifi-swap`,
      `${getTokenId(ChainId.Ethereum, CommonAddress.Ethereum.USDC)}->${getTokenId(
        ChainId.ArbitrumOne,
        CommonAddress.ArbitrumOne.USDC,
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

    const swapFallbackResponse = await getRouteCandidates({
      sourceTokenId: getTokenId(ChainId.Ethereum, daiAddress),
      destinationChainId: ChainId.ArbitrumOne,
      includeSwapFallback: true,
    });

    expect(swapFallbackResponse.items.length).toBeGreaterThan(0);
    expect(swapFallbackResponse.items.every((item) => item.routeId.endsWith(':lifi-swap'))).toBe(
      true,
    );
  });
});
