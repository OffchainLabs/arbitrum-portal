import { CoinKey } from '@lifi/sdk';
import { describe, expect, it } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';

import type { LifiTokenWithCoinKey } from '../../registry';
import { mapSourceTokensToTransferTokens } from './route';

const buildToken = (
  overrides: Partial<LifiTokenWithCoinKey> & Pick<LifiTokenWithCoinKey, 'coinKey'>,
): LifiTokenWithCoinKey => ({
  address: '0x0000000000000000000000000000000000000001',
  name: 'Token',
  symbol: overrides.coinKey,
  decimals: 18,
  priceUSD: '1',
  chainId: 42161,
  ...overrides,
});

describe('mapSourceTokensToTransferTokens', () => {
  it('maps ETH deposits into ApeChain to WETH destination token', () => {
    const sourceTokens = [
      buildToken({ coinKey: CoinKey.ETH, chainId: 42161 }),
      buildToken({ coinKey: CoinKey.WETH, chainId: 42161 }),
    ];
    const destinationTokensByCoinKey = {
      WETH: buildToken({ chainId: 33139, coinKey: CoinKey.WETH }),
    };

    const result = mapSourceTokensToTransferTokens({
      sourceTokens,
      destinationTokensByCoinKey,
      destinationChainId: ChainId.ApeChain,
    });

    expect(result).toHaveLength(2);
    // Both ETH and WETH on Arbitrum map to WETH on ApeChain
    expect(result[0]?.destinationToken).toEqual(result[1]?.destinationToken);
    expect(result).toMatchSnapshot();
  });

  it('from ApeChain to ArbitrumOne, withdraw WETH to WETH', () => {
    const sourceTokens = [
      buildToken({
        coinKey: CoinKey.WETH,
        chainId: 33139,
        address: '0x0000000000000000000000000000000000000002',
      }),
    ];
    const destinationTokensByCoinKey = {
      WETH: buildToken({ chainId: 42161, coinKey: CoinKey.WETH }),
    };

    const result = mapSourceTokensToTransferTokens({
      sourceTokens,
      destinationTokensByCoinKey,
      destinationChainId: ChainId.ArbitrumOne,
    });

    expect(result).toHaveLength(1);
    expect(result).toMatchSnapshot();
  });

  it('For other chain, map WETH to WETH and ETH to ETH', () => {
    const sourceTokens = [
      buildToken({
        coinKey: CoinKey.WETH,
        chainId: 1,
        address: '0x0000000000000000000000000000000000000002',
      }),
      buildToken({
        coinKey: CoinKey.ETH,
        chainId: 1,
        address: '0x0000000000000000000000000000000000000002',
      }),
    ];
    const destinationTokensByCoinKey = {
      WETH: buildToken({ chainId: 55244, coinKey: CoinKey.WETH }),
      ETH: buildToken({ chainId: 55244, coinKey: CoinKey.ETH }),
    };

    const result = mapSourceTokensToTransferTokens({
      sourceTokens,
      destinationTokensByCoinKey,
      destinationChainId: ChainId.ArbitrumOne,
    });

    expect(result).toHaveLength(2);
    expect(result).toMatchSnapshot();
  });
});
