import { CoinKey, ChainId as LiFiChainId } from '@lifi/sdk';
import { describe, expect, it } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';

import { groupChildTokensAndParentTokens } from '../groupChildTokensAndParentTokens';
import type { LifiTokenWithCoinKey } from '../registry';

const buildToken = (
  overrides: Partial<LifiTokenWithCoinKey> & Pick<LifiTokenWithCoinKey, 'coinKey'>,
): LifiTokenWithCoinKey => ({
  address: '0x0000000000000000000000000000000000000001',
  name: 'Token',
  symbol: overrides.coinKey,
  decimals: 18,
  priceUSD: '1',
  chainId: LiFiChainId.ARB,
  logoURI: 'https://example.com/logo.png',
  ...overrides,
});

type BridgeInfo = Record<
  string,
  {
    tokenAddress: string;
    name?: string;
    symbol?: string;
    decimals?: number;
    logoURI?: string;
  }
>;

describe('groupChildTokensAndParentTokens', () => {
  it('maps ETH and WETH deposits to WETH on ApeChain', () => {
    const parentTokens = [
      buildToken({ coinKey: CoinKey.ETH, chainId: LiFiChainId.ARB }),
      buildToken({ coinKey: CoinKey.WETH, chainId: LiFiChainId.ARB }),
    ];
    const childTokensByCoinKey = {
      [CoinKey.WETH]: buildToken({
        chainId: LiFiChainId.APE,
        coinKey: CoinKey.WETH,
        logoURI: 'https://example.com/weth.png',
      }),
    };

    const tokens = groupChildTokensAndParentTokens({
      parentTokens,
      childTokensByCoinKey,
      parentChainId: ChainId.ArbitrumOne,
      childChainId: ChainId.ApeChain,
    });

    expect(tokens).toHaveLength(2);
    tokens.forEach((token, index) => {
      const parentToken = parentTokens[index];
      expect(token).toMatchObject({
        chainId: ChainId.ApeChain,
        address: childTokensByCoinKey[CoinKey.WETH].address,
        symbol: childTokensByCoinKey[CoinKey.WETH].symbol,
        logoURI: 'https://example.com/weth.png',
      });

      const bridgeInfo = (token.extensions?.bridgeInfo as BridgeInfo | undefined)?.[
        ChainId.ArbitrumOne.toString()
      ];
      expect(bridgeInfo).toEqual({
        tokenAddress: parentToken?.address,
        name: parentToken?.name,
        symbol: parentToken?.symbol,
        decimals: parentToken?.decimals,
        logoURI: parentToken?.logoURI,
      });
    });
  });

  it('maps WETH and ETH to their corresponding child tokens when both exist', () => {
    const parentTokens = [
      buildToken({
        coinKey: CoinKey.WETH,
        chainId: LiFiChainId.ETH,
        address: '0x0000000000000000000000000000000000000002',
      }),
      buildToken({
        coinKey: CoinKey.ETH,
        chainId: LiFiChainId.ETH,
        address: '0x0000000000000000000000000000000000000003',
      }),
    ];
    const childTokensByCoinKey = {
      [CoinKey.WETH]: buildToken({
        coinKey: CoinKey.WETH,
        chainId: LiFiChainId.ARB,
        address: '0x0000000000000000000000000000000000000010',
      }),
      [CoinKey.ETH]: buildToken({
        coinKey: CoinKey.ETH,
        chainId: LiFiChainId.ARB,
        address: '0x0000000000000000000000000000000000000011',
      }),
    };

    const tokens = groupChildTokensAndParentTokens({
      parentTokens,
      childTokensByCoinKey,
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne,
    });

    expect(tokens).toEqual([
      expect.objectContaining({
        chainId: ChainId.ArbitrumOne,
        address: childTokensByCoinKey[CoinKey.WETH].address,
        symbol: CoinKey.WETH,
      }),
      expect.objectContaining({
        chainId: ChainId.ArbitrumOne,
        address: childTokensByCoinKey[CoinKey.ETH].address,
        symbol: CoinKey.ETH,
      }),
    ]);
  });

  it('uses parent logo when child token logo is missing', () => {
    const parentLogo = 'https://example.com/parent.png';
    const parentTokens = [
      buildToken({
        coinKey: CoinKey.ETH,
        chainId: LiFiChainId.ETH,
        logoURI: parentLogo,
      }),
    ];
    const childTokensByCoinKey = {
      [CoinKey.ETH]: buildToken({
        coinKey: CoinKey.ETH,
        chainId: LiFiChainId.ARB,
        logoURI: undefined,
      }),
    };

    const tokens = groupChildTokensAndParentTokens({
      parentTokens,
      childTokensByCoinKey,
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne,
    });

    expect(tokens[0]?.logoURI).toBe(parentLogo);
  });

  it('uses child logo when parent token logo is missing', () => {
    const childLogo = 'https://example.com/child.png';
    const parentTokens = [
      buildToken({
        coinKey: CoinKey.WETH,
        chainId: LiFiChainId.ARB,
        logoURI: undefined,
      }),
    ];
    const childTokensByCoinKey = {
      [CoinKey.WETH]: buildToken({
        coinKey: CoinKey.WETH,
        chainId: LiFiChainId.SUP,
        logoURI: childLogo,
      }),
    };

    const tokens = groupChildTokensAndParentTokens({
      parentTokens,
      childTokensByCoinKey,
      parentChainId: ChainId.ArbitrumOne,
      childChainId: ChainId.Superposition,
    });

    expect(tokens[0]?.logoURI).toBe(childLogo);
  });

  it('maps USDC from parent chains to USDC on ApeChain (normalized from USDCe)', () => {
    const parentTokens = [buildToken({ coinKey: CoinKey.USDC, chainId: LiFiChainId.ARB })];
    const childTokensByCoinKey = {
      // On ApeChain, USDCe tokens are normalized to USDC coinKey in the registry
      [CoinKey.USDC]: buildToken({
        chainId: LiFiChainId.APE,
        coinKey: CoinKey.USDC,
        symbol: 'USDC.e',
        name: 'Bridged USDC',
      }),
    };

    const tokens = groupChildTokensAndParentTokens({
      parentTokens,
      childTokensByCoinKey,
      parentChainId: ChainId.ArbitrumOne,
      childChainId: ChainId.ApeChain,
    });

    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      chainId: ChainId.ApeChain,
      address: childTokensByCoinKey[CoinKey.USDC].address,
      symbol: 'USDC.e',
    });
  });
});
