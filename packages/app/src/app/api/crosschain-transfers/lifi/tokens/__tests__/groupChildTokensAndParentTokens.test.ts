import { CoinKey, ChainId as LiFiChainId, type Token as LiFiToken } from '@lifi/sdk';
import { describe, expect, it } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';
import {
  LIFI_TRANSFER_LIST_ID,
  isTokenAvailableOnChain,
  tokenListTokenToBridgeToken,
} from '@/bridge/util/TokenListUtils';

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

const unmatchedRobinhoodToken: LiFiToken = {
  address: '0x0000000000000000000000000000000000004663',
  name: 'Robinhood-only token',
  symbol: 'RHOOD',
  decimals: 18,
  priceUSD: '1',
  chainId: ChainId.RobinhoodChain as unknown as LiFiChainId,
  logoURI: 'https://example.com/robinhood.png',
};

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
        chainId: LiFiChainId.APE,
        logoURI: childLogo,
      }),
    };

    const tokens = groupChildTokensAndParentTokens({
      parentTokens,
      childTokensByCoinKey,
      parentChainId: ChainId.ArbitrumOne,
      childChainId: ChainId.ApeChain,
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

  it('includes an unmatched Robinhood token as a chain-specific list entry', () => {
    const tokens = groupChildTokensAndParentTokens({
      parentTokens: [],
      childTokens: [unmatchedRobinhoodToken],
      childTokensByCoinKey: {},
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.RobinhoodChain,
    });

    expect(tokens).toEqual([
      expect.objectContaining({
        chainId: ChainId.RobinhoodChain,
        address: unmatchedRobinhoodToken.address,
        symbol: unmatchedRobinhoodToken.symbol,
      }),
    ]);
    expect(tokens[0]?.extensions?.bridgeInfo).toBeUndefined();
  });

  it('does not include unmatched tokens for chains without the opt-in', () => {
    const tokens = groupChildTokensAndParentTokens({
      parentTokens: [],
      childTokens: [{ ...unmatchedRobinhoodToken, chainId: LiFiChainId.ARB }],
      childTokensByCoinKey: {},
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne,
    });

    expect(tokens).toEqual([]);
  });

  it.each([ChainId.RobinhoodChain, ChainId.ArbitrumOne])(
    'includes only canonical Base USDC among unmatched Base tokens for swaps to %s',
    (childChainId) => {
      const baseUsdc = buildToken({
        chainId: ChainId.Base,
        address: CommonAddress.Base.USDC.toUpperCase(),
        coinKey: CoinKey.USDC,
        name: 'USD Coin',
        decimals: 6,
      });
      const tokens = groupChildTokensAndParentTokens({
        parentTokens: [
          baseUsdc,
          buildToken({ chainId: ChainId.Base, coinKey: CoinKey.USDT }),
          // A matching symbol/coinKey is insufficient: only the canonical address is allowed.
          buildToken({ chainId: ChainId.Base, coinKey: CoinKey.USDC }),
        ],
        childTokens: [],
        childTokensByCoinKey: {},
        parentChainId: ChainId.Base,
        childChainId,
      });

      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        chainId: ChainId.Base,
        address: baseUsdc.address,
        symbol: 'USDC',
        decimals: 6,
      });
      expect(tokens[0]?.extensions?.bridgeInfo).toBeUndefined();

      const baseUsdcEntry = tokens[0];
      if (!baseUsdcEntry) {
        throw new Error('Expected Base USDC in the token list');
      }
      const bridgeToken = tokenListTokenToBridgeToken({
        token: baseUsdcEntry,
        listId: LIFI_TRANSFER_LIST_ID,
        parentChainId: ChainId.Base,
        childChainId,
      });
      expect(bridgeToken).toMatchObject({
        address: CommonAddress.Base.USDC.toLowerCase(),
        lifiOnlyChainId: ChainId.Base,
      });
      expect(bridgeToken?.l2Address).toBeUndefined();
      expect(isTokenAvailableOnChain(bridgeToken, ChainId.Base)).toBe(true);
      expect(isTokenAvailableOnChain(bridgeToken, childChainId)).toBe(false);
    },
  );

  it.each([ChainId.Ethereum, ChainId.ApeChain])(
    'does not expand unmatched Base tokens for destination %s',
    (childChainId) => {
      const tokens = groupChildTokensAndParentTokens({
        parentTokens: [
          buildToken({
            chainId: ChainId.Base,
            address: CommonAddress.Base.USDC,
            coinKey: CoinKey.USDC,
          }),
        ],
        childTokensByCoinKey: {},
        parentChainId: ChainId.Base,
        childChainId,
      });

      expect(tokens).toEqual([]);
    },
  );

  it.each([ChainId.RobinhoodChain, ChainId.ArbitrumOne])(
    'does not duplicate Base USDC when a matching token exists on %s',
    (childChainId) => {
      const childUsdc = buildToken({
        chainId: childChainId,
        coinKey: CoinKey.USDC,
      });
      const tokens = groupChildTokensAndParentTokens({
        parentTokens: [
          buildToken({
            chainId: ChainId.Base,
            address: CommonAddress.Base.USDC,
            coinKey: CoinKey.USDC,
          }),
        ],
        childTokensByCoinKey: { [CoinKey.USDC]: childUsdc },
        parentChainId: ChainId.Base,
        childChainId,
      });

      expect(tokens).toHaveLength(1);
      expect(tokens[0]?.chainId).toBe(childChainId);
      expect(tokens[0]?.extensions?.bridgeInfo).toMatchObject({
        [ChainId.Base]: { tokenAddress: CommonAddress.Base.USDC },
      });
    },
  );
});
