import { constants } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import * as lifiCrossTransfers from '../../hooks/useLifiCrossTransferRoute';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import {
  type RouteTokenCase,
  type TokenExpectation,
  type TokenPanelExpectations,
  apeTokenExpectation,
  ethTokenExpectation,
  expectTokenButtonContent,
  expectTokenPanelContent,
  nativeApeTokenExpectation,
  nativeEthTokenExpectation,
  renderTransferPanel,
  setDestinationToken,
  setSourceToken,
  setupTransferPanelLifiIntegrationSuite,
  tokenExpectationsByChain,
  usdtArbitrumOneRowTokenExpectation,
} from './TransferPanel.integration.helpers';

type DefaultTokenCase = {
  sourceChain: RouteTokenCase['sourceChain'];
  destinationChain: RouteTokenCase['destinationChain'];
  sourceToken: TokenExpectation;
  destinationToken: TokenExpectation;
  expectedSourcePanelTokens: TokenPanelExpectations;
  expectedDestinationPanelTokens: TokenPanelExpectations;
  /** Leading rows of the destination panel, for chains that pin tokens. */
  expectedDestinationPanelOrder?: string[];
};

const defaultTokenCases: DefaultTokenCase[] = [
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'apechain',
    sourceToken: apeTokenExpectation,
    destinationToken: apeTokenExpectation,
    expectedSourcePanelTokens: [nativeApeTokenExpectation],
    expectedDestinationPanelTokens: [nativeApeTokenExpectation],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'robinhood-chain',
    sourceToken: apeTokenExpectation,
    destinationToken: apeTokenExpectation,
    expectedSourcePanelTokens: [nativeApeTokenExpectation],
    expectedDestinationPanelTokens: [nativeApeTokenExpectation],
  },
  {
    sourceChain: 'base',
    destinationChain: 'apechain',
    sourceToken: apeTokenExpectation,
    destinationToken: apeTokenExpectation,
    expectedSourcePanelTokens: [nativeApeTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeApeTokenExpectation,
      tokenExpectationsByChain.ApeChain.USDCe,
      tokenExpectationsByChain.ApeChain.USDT,
      tokenExpectationsByChain.ApeChain.WETH,
    ],
  },
  {
    sourceChain: 'base',
    destinationChain: 'arbitrum-one',
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      tokenExpectationsByChain.ArbitrumOne.USDC,
      {
        ...tokenExpectationsByChain.ArbitrumOne.USDT,
        logoURI: usdtArbitrumOneRowTokenExpectation.logoURI,
      },
      {
        ...tokenExpectationsByChain.ArbitrumOne.WETH,
        logoURI:
          'https://static.debank.com/image/era_token/logo_url/0x5aea5775959fbc2557cc8789bc1bf90a239d9a91/61844453e63cf81301f845d7864236f6.png',
      },
    ],
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'apechain',
    sourceToken: apeTokenExpectation,
    destinationToken: apeTokenExpectation,
    expectedSourcePanelTokens: [nativeApeTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeApeTokenExpectation,
      tokenExpectationsByChain.ApeChain.USDCe,
      tokenExpectationsByChain.ApeChain.USDT,
      tokenExpectationsByChain.ApeChain.WETH,
    ],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'arbitrum-one',
    sourceToken: apeTokenExpectation,
    destinationToken: apeTokenExpectation,
    expectedSourcePanelTokens: [nativeApeTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeApeTokenExpectation,
      tokenExpectationsByChain.ArbitrumOne.USDC,
      tokenExpectationsByChain.ArbitrumOne.USDT,
      tokenExpectationsByChain.ArbitrumOne.WETH,
      nativeEthTokenExpectation,
    ],
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    sourceToken: apeTokenExpectation,
    destinationToken: apeTokenExpectation,
    expectedSourcePanelTokens: [nativeApeTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeApeTokenExpectation,
      tokenExpectationsByChain.ApeChain.USDCe,
      tokenExpectationsByChain.ApeChain.USDT,
      tokenExpectationsByChain.ApeChain.WETH,
    ],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    sourceToken: apeTokenExpectation,
    destinationToken: apeTokenExpectation,
    expectedSourcePanelTokens: [nativeApeTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeApeTokenExpectation,
      tokenExpectationsByChain.Ethereum.USDC,
      tokenExpectationsByChain.Ethereum.USDT,
      tokenExpectationsByChain.Ethereum.WETH,
      nativeEthTokenExpectation,
    ],
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'robinhood-chain',
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      tokenExpectationsByChain.RobinhoodChain.WETH,
      tokenExpectationsByChain.RobinhoodChain.USDe,
      tokenExpectationsByChain.RobinhoodChain.USDG,
    ],
    expectedDestinationPanelOrder: ['ETH', 'USDG'],
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'robinhood-chain',
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      tokenExpectationsByChain.RobinhoodChain.WETH,
      tokenExpectationsByChain.RobinhoodChain.USDe,
      tokenExpectationsByChain.RobinhoodChain.USDG,
    ],
    expectedDestinationPanelOrder: ['ETH', 'USDG'],
  },
  {
    sourceChain: 'base',
    destinationChain: 'robinhood-chain',
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      tokenExpectationsByChain.RobinhoodChain.WETH,
      tokenExpectationsByChain.RobinhoodChain.USDe,
      tokenExpectationsByChain.RobinhoodChain.USDG,
    ],
    expectedDestinationPanelOrder: ['ETH', 'USDG'],
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'ethereum',
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      {
        ...tokenExpectationsByChain.RobinhoodChain.WETH,
        contract: CommonAddress.Ethereum.WETH,
      },
    ],
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'arbitrum-one',
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      {
        ...tokenExpectationsByChain.RobinhoodChain.WETH,
        contract: CommonAddress.ArbitrumOne.WETH,
      },
    ],
  },
];

async function assertDefaultTokenCase({
  sourceChain,
  destinationChain,
  sourceToken,
  destinationToken,
  expectedSourcePanelTokens,
  expectedDestinationPanelTokens,
  expectedDestinationPanelOrder,
}: DefaultTokenCase) {
  await renderTransferPanel({
    sourceChain,
    destinationChain,
  });

  await expectTokenButtonContent({
    isDestination: false,
    tokenExpectation: sourceToken,
  });
  await expectTokenButtonContent({
    isDestination: true,
    tokenExpectation: destinationToken,
  });

  await expectTokenPanelContent({
    isDestination: false,
    symbolsToContain: expectedSourcePanelTokens.map(({ symbol }) => symbol),
    tokenExpectations: expectedSourcePanelTokens,
  });
  await expectTokenPanelContent({
    isDestination: true,
    symbolsToContain: expectedDestinationPanelTokens.map(({ symbol }) => symbol),
    symbolsInOrder: expectedDestinationPanelOrder,
    tokenExpectations: expectedDestinationPanelTokens,
  });
}

describe.sequential('TransferPanel LiFi Integration - Default Token', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each([
    {
      sourceName: 'Ethereum',
      sourceChain: 'ethereum',
      sourceChainId: ChainId.Ethereum,
      usdc: CommonAddress.Ethereum.USDC,
    },
    {
      sourceName: 'Arbitrum One',
      sourceChain: 'arbitrum-one',
      sourceChainId: ChainId.ArbitrumOne,
      usdc: CommonAddress.ArbitrumOne.USDC,
    },
  ] as const)(
    'defaults $sourceName USDC to ETH on Robinhood when no supported USDC pair exists',
    async ({ sourceChain, sourceChainId, usdc }) => {
      const quoteSpy = vi.spyOn(lifiCrossTransfers, 'useLifiCrossTransfersRoute');
      const sourceUsdc = {
        ...tokenExpectationsByChain.Ethereum.USDC,
        contract: usdc,
        logoURI:
          'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
      };

      await renderTransferPanel({
        sourceChain,
        destinationChain: 'robinhood-chain',
      });
      await setSourceToken(sourceUsdc);
      expect(quoteSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          fromChainId: sourceChainId,
          fromToken: usdc,
          toChainId: ChainId.RobinhoodChain,
          toToken: constants.AddressZero,
        }),
      );
      await expectTokenButtonContent({
        isDestination: true,
        tokenExpectation: ethTokenExpectation,
      });
      await expectTokenPanelContent({
        isDestination: true,
        symbolsToContain: ['ETH', 'USDG'],
        symbolsToExclude: ['USDC'],
        tokenExpectations: [
          nativeEthTokenExpectation,
          tokenExpectationsByChain.RobinhoodChain.USDG,
        ],
      });
      await setDestinationToken(tokenExpectationsByChain.RobinhoodChain.USDG);
      await expectTokenButtonContent({
        isDestination: true,
        tokenExpectation: tokenExpectationsByChain.RobinhoodChain.USDG,
      });
      expect(quoteSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ toToken: CommonAddress.RobinhoodChain.USDG }),
      );
      await setDestinationToken(nativeEthTokenExpectation);
      await expectTokenButtonContent({
        isDestination: true,
        tokenExpectation: ethTokenExpectation,
      });
      quoteSpy.mockRestore();
    },
  );

  it.each(defaultTokenCases)(
    'opens source and destination token panels with expected entries for default token transfer: $sourceChain -> $destinationChain',
    assertDefaultTokenCase,
  );

  it.each([
    {
      sourceChain: 'arbitrum-one' as const,
      chainId: ChainId.ArbitrumOne,
      address: CommonAddress.ArbitrumOne.USDC,
    },
    {
      sourceChain: 'ethereum' as const,
      chainId: ChainId.Ethereum,
      address: CommonAddress.Ethereum.USDC,
    },
  ])(
    'defaults a saved $sourceChain USDC destination to ETH on Robinhood',
    async ({ sourceChain, chainId, address }) => {
      const quoteSpy = vi.spyOn(lifiCrossTransfers, 'useLifiCrossTransfersRoute');
      await renderTransferPanel({
        sourceChain,
        destinationChain: 'robinhood-chain',
        token: address,
        destinationToken: address,
      });

      await expectTokenButtonContent({
        isDestination: false,
        tokenExpectation: {
          symbol: 'USDC',
          logoURI:
            'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
        },
      });
      await expectTokenButtonContent({
        isDestination: true,
        tokenExpectation: ethTokenExpectation,
      });
      expect(quoteSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          fromChainId: chainId,
          fromToken: address,
          toChainId: ChainId.RobinhoodChain,
          toToken: constants.AddressZero,
        }),
      );
      quoteSpy.mockRestore();
    },
  );
});
