import { CoinKey } from '@lifi/sdk';
import { ChainId } from '@lifi/sdk';
import { describe, expect, it } from 'vitest';

import { handleUSDC } from './registry';

const placeholderToken = {
  address: '0x0000000000000000000000000000000000000000',
  name: 'Ether',
  symbol: 'ETH',
  decimals: 18,
  priceUSD: '0',
};

describe('handleUSDC', () => {
  it('drops USDCe on chains where native USDC exist', () => {
    expect(
      handleUSDC({ ...placeholderToken, chainId: ChainId.ARB, coinKey: CoinKey.USDCe }),
    ).toBeNull();
    expect(
      handleUSDC({ ...placeholderToken, chainId: ChainId.ETH, coinKey: CoinKey.USDCe }),
    ).toBeNull();
    expect(
      handleUSDC({ ...placeholderToken, chainId: ChainId.BAS, coinKey: CoinKey.USDCe }),
    ).toBeNull();
  });

  it('keeps USDCe on chains without native USDC', () => {
    expect(
      handleUSDC({ ...placeholderToken, chainId: ChainId.APE, coinKey: CoinKey.USDCe }),
    ).toEqual({
      ...placeholderToken,
      chainId: ChainId.APE,
      coinKey: CoinKey.USDC,
    });
    expect(
      handleUSDC({ ...placeholderToken, chainId: ChainId.SUP, coinKey: CoinKey.USDCe }),
    ).toEqual({
      ...placeholderToken,
      chainId: ChainId.SUP,
      coinKey: CoinKey.USDC,
    });
  });

  it('returns original token for non USDC tokens', () => {
    expect(
      handleUSDC({ ...placeholderToken, chainId: ChainId.BAS, coinKey: CoinKey.WBTC }),
    ).toEqual({
      ...placeholderToken,
      chainId: ChainId.BAS,
      coinKey: CoinKey.WBTC,
    });
    expect(
      handleUSDC({ ...placeholderToken, chainId: ChainId.APE, coinKey: CoinKey.WETH }),
    ).toEqual({
      ...placeholderToken,
      chainId: ChainId.APE,
      coinKey: CoinKey.WETH,
    });
  });
});
