import { CoinKey, ChainId as LiFiChainId, type Token as LiFiToken } from '@lifi/sdk';
import { describe, expect, it } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

import { buildLifiTokenRegistry } from '../registry';

function buildToken(overrides: Partial<LiFiToken>): LiFiToken {
  return {
    address: '0x0000000000000000000000000000000000000001',
    chainId: LiFiChainId.ARB,
    decimals: 18,
    name: 'Token',
    priceUSD: '1',
    symbol: 'TOKEN',
    ...overrides,
  };
}

describe('buildLifiTokenRegistry', () => {
  it('keeps unpaired tokens from enabled chains separate from normal coinKey tokens', () => {
    const robinhoodStockToken = buildToken({
      address: '0x0000000000000000000000000000000000000100',
      chainId: ChainId.RobinhoodChain as unknown as LiFiChainId,
      name: 'Robinhood Stock Token',
      symbol: 'STOCK',
    });
    const robinhoodCustomToken = buildToken({
      address: CommonAddress.RobinhoodChain.ENA,
      chainId: ChainId.RobinhoodChain as unknown as LiFiChainId,
      name: 'Ethena',
      symbol: 'ENA',
    });
    const ethereumTokenWithoutCoinKey = buildToken({
      address: '0x0000000000000000000000000000000000000200',
      chainId: LiFiChainId.ETH,
      name: 'Ethereum Token Without CoinKey',
      symbol: 'NOPE',
    });
    const ethereumUsdc = buildToken({
      address: CommonAddress.Ethereum.USDC,
      chainId: LiFiChainId.ETH,
      coinKey: CoinKey.USDC,
      name: 'USD Coin',
      symbol: 'USDC',
    });

    const registry = buildLifiTokenRegistry({
      [ChainId.Ethereum]: [ethereumTokenWithoutCoinKey, ethereumUsdc],
      [ChainId.RobinhoodChain]: [robinhoodStockToken, robinhoodCustomToken],
    });

    expect(registry.unpairedTokensByChain).toEqual({
      [ChainId.RobinhoodChain]: [robinhoodStockToken],
    });
    expect(
      registry.tokensByChain[ChainId.RobinhoodChain]?.some(
        (token) => token.address.toLowerCase() === CommonAddress.RobinhoodChain.ENA.toLowerCase(),
      ),
    ).toBe(true);
    expect(registry.tokensByChainAndCoinKey[ChainId.Ethereum]?.[CoinKey.USDC]).toMatchObject({
      address: CommonAddress.Ethereum.USDC,
      coinKey: CoinKey.USDC,
    });
  });
});
