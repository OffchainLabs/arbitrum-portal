import { CoinKey, type Token as LiFiToken } from '@lifi/sdk';
import { describe, expect, it } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

import type { LifiTokenWithCoinKey } from '../registry';
import { appendAdditionalRouteTokens, getParentTokensForRoute } from '../routeTokenUtils';

const buildLifiToken = (overrides: Partial<LiFiToken> = {}): LiFiToken =>
  ({
    address: '0x0000000000000000000000000000000000000001',
    chainId: ChainId.RobinhoodChain,
    decimals: 18,
    name: 'Token',
    symbol: 'TKN',
    logoURI: 'https://example.com/token.png',
    priceUSD: '1',
    ...overrides,
  }) as LiFiToken;

const buildTokenWithCoinKey = (
  overrides: Partial<LifiTokenWithCoinKey> = {},
): LifiTokenWithCoinKey =>
  ({
    ...buildLifiToken(),
    coinKey: CoinKey.ETH,
    ...overrides,
  }) as LifiTokenWithCoinKey;

describe('getParentTokensForRoute', () => {
  it('keeps Robinhood source routes limited to the allowed outbound token list', () => {
    const allowedToken = buildTokenWithCoinKey({
      address: CommonAddress.RobinhoodChain.USDe,
      coinKey: 'USDe' as CoinKey,
    });
    const stockToken = buildTokenWithCoinKey({
      address: '0x00000000000000000000000000000000000000aa',
      coinKey: 'AAPL' as CoinKey,
    });

    expect(
      getParentTokensForRoute({
        parentChainId: ChainId.RobinhoodChain,
        tokens: [allowedToken, stockToken],
      }),
    ).toEqual([allowedToken]);
  });

  it('does not filter non-Robinhood source routes', () => {
    const tokens = [
      buildTokenWithCoinKey({ address: '0x00000000000000000000000000000000000000aa' }),
    ];

    expect(
      getParentTokensForRoute({
        parentChainId: ChainId.Ethereum,
        tokens,
      }),
    ).toBe(tokens);
  });
});

describe('appendAdditionalRouteTokens', () => {
  it('appends unmatched LiFi tokens when Robinhood is the destination chain', () => {
    const existingTokenAddress = CommonAddress.RobinhoodChain.WETH;
    const stockTokenAddress = '0x00000000000000000000000000000000000000aa';
    const tokens = [
      {
        chainId: ChainId.RobinhoodChain,
        address: existingTokenAddress,
        name: 'Wrapped Ether',
        symbol: 'WETH',
        decimals: 18,
      },
    ];
    const rawChildTokens = [
      buildLifiToken({ address: existingTokenAddress, symbol: 'WETH' }),
      buildLifiToken({
        address: stockTokenAddress,
        name: 'Apple Stock',
        symbol: 'AAPL',
        logoURI: undefined,
      }),
    ];

    const result = appendAdditionalRouteTokens({
      childChainId: ChainId.RobinhoodChain,
      parentChainId: ChainId.Ethereum,
      tokens,
      childAdditionalTokens: rawChildTokens,
    });

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({
      chainId: ChainId.RobinhoodChain,
      address: stockTokenAddress,
      name: 'Apple Stock',
      symbol: 'AAPL',
      decimals: 18,
      extensions: {
        priceUSD: '1',
        isLifiDestinationOnly: true,
        bridgeInfo: {
          [ChainId.Ethereum]: {
            tokenAddress: stockTokenAddress,
            name: 'Apple Stock',
            symbol: 'AAPL',
            decimals: 18,
            logoURI: undefined,
          },
        },
      },
    });
  });

  it('does not append additional tokens for unconfigured destination chains', () => {
    const tokens = [
      {
        chainId: ChainId.ArbitrumOne,
        address: CommonAddress.ArbitrumOne.WETH,
        name: 'Wrapped Ether',
        symbol: 'WETH',
        decimals: 18,
      },
    ];

    expect(
      appendAdditionalRouteTokens({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        tokens,
        childAdditionalTokens: [
          buildLifiToken({ address: '0x00000000000000000000000000000000000000aa' }),
        ],
      }),
    ).toBe(tokens);
  });
});
