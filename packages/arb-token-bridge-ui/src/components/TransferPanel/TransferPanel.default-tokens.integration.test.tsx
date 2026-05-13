import { describe, it } from 'vitest';

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
  setupTransferPanelLifiIntegrationSuite,
  tokenExpectationsByChain,
  usdtArbitrumOneRowTokenExpectation,
  wethSuperpositionRowTokenExpectation,
  wethTokenExpectation,
} from './TransferPanel.integration.helpers';

type DefaultTokenCase = {
  sourceChain: RouteTokenCase['sourceChain'];
  destinationChain: RouteTokenCase['destinationChain'];
  sourceToken: TokenExpectation;
  destinationToken: TokenExpectation;
  expectedSourcePanelTokens: TokenPanelExpectations;
  expectedDestinationPanelTokens: TokenPanelExpectations;
};

const defaultTokenCases: DefaultTokenCase[] = [
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
    destinationChain: 'superposition',
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      tokenExpectationsByChain.Superposition.USDCe,
      {
        ...tokenExpectationsByChain.Superposition.WETH,
        logoURI: wethSuperpositionRowTokenExpectation.logoURI,
      },
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
    sourceChain: 'arbitrum-one',
    destinationChain: 'superposition',
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      tokenExpectationsByChain.Superposition.USDCe,
      {
        ...tokenExpectationsByChain.Superposition.WETH,
        logoURI: wethSuperpositionRowTokenExpectation.logoURI,
      },
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
      {
        ...tokenExpectationsByChain.ArbitrumOne.USDC,
        contract: CommonAddress.ApeChain.USDCe,
      },
      {
        ...tokenExpectationsByChain.ArbitrumOne.USDT,
        contract: CommonAddress.ApeChain.USDT,
      },
      {
        ...tokenExpectationsByChain.ArbitrumOne.WETH,
        contract: CommonAddress.ApeChain.WETH,
      },
      nativeEthTokenExpectation,
    ],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'arbitrum-one',
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      {
        ...tokenExpectationsByChain.ArbitrumOne.USDC,
        contract: CommonAddress.Superposition.USDCe,
      },
      {
        ...tokenExpectationsByChain.ArbitrumOne.WETH,
        logoURI: wethSuperpositionRowTokenExpectation.logoURI,
        contract: CommonAddress.Superposition.WETH,
      },
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
      {
        ...tokenExpectationsByChain.Ethereum.USDC,
        contract: CommonAddress.ApeChain.USDCe,
      },
      {
        ...tokenExpectationsByChain.Ethereum.USDT,
        contract: CommonAddress.ApeChain.USDT,
      },
      {
        ...tokenExpectationsByChain.Ethereum.WETH,
        contract: CommonAddress.ApeChain.WETH,
      },
      nativeEthTokenExpectation,
    ],
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      tokenExpectationsByChain.Superposition.USDCe,
      {
        ...tokenExpectationsByChain.Superposition.WETH,
        logoURI: wethSuperpositionRowTokenExpectation.logoURI,
      },
    ],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      {
        ...tokenExpectationsByChain.Ethereum.USDC,
        contract: CommonAddress.Superposition.USDCe,
      },
      {
        ...tokenExpectationsByChain.Ethereum.WETH,
        logoURI: wethSuperpositionRowTokenExpectation.logoURI,
        contract: CommonAddress.Superposition.WETH,
      },
    ],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    sourceToken: apeTokenExpectation,
    destinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeApeTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      tokenExpectationsByChain.ApeChain.USDCe,
      {
        ...tokenExpectationsByChain.Superposition.WETH,
        contract: CommonAddress.ApeChain.WETH,
      },
    ],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    sourceToken: ethTokenExpectation,
    destinationToken: wethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      tokenExpectationsByChain.ApeChain.WETH,
      nativeApeTokenExpectation,
      tokenExpectationsByChain.ApeChain.USDCe,
    ],
  },
];

describe.sequential('TransferPanel LiFi Integration - Default Token', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(defaultTokenCases)(
    'opens source and destination token panels with expected entries for default token transfer: $sourceChain -> $destinationChain',
    async ({
      sourceChain,
      destinationChain,
      sourceToken,
      destinationToken,
      expectedSourcePanelTokens,
      expectedDestinationPanelTokens,
    }) => {
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
        tokenExpectations: expectedDestinationPanelTokens,
      });
    },
  );
});
