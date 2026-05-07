import { describe, it } from 'vitest';

import { CommonAddress } from '../../util/CommonAddressUtils';
import {
  type RouteTokenCase,
  type TokenExpectation,
  type TokenPanelExpectations,
  apeTokenExpectation,
  ethTokenExpectation,
  expectTokenButtonToken,
  expectTokenPanelContent,
  nativeApeTokenExpectation,
  nativeEthTokenExpectation,
  renderTransferPanel,
  setupTransferPanelLifiIntegrationSuite,
  usdcTokenByChain,
  usdtArbitrumOneRowTokenExpectation,
  usdtTokenByChain,
  wethSuperpositionRowTokenExpectation,
  wethTokenByChain,
  wethTokenExpectation,
} from './TransferPanel.integration.helpers';

type DefaultTokenCase = {
  sourceChain: RouteTokenCase['sourceChain'];
  destinationChain: RouteTokenCase['destinationChain'];
  expectedSourceToken: TokenExpectation;
  expectedDestinationToken: TokenExpectation;
  expectedSourcePanelTokens: TokenPanelExpectations;
  expectedDestinationPanelTokens: TokenPanelExpectations;
};

const defaultTokenCases: DefaultTokenCase[] = [
  {
    sourceChain: 'base',
    destinationChain: 'apechain',
    expectedSourceToken: apeTokenExpectation,
    expectedDestinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeApeTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeApeTokenExpectation,
      usdcTokenByChain.apeChain,
      usdtTokenByChain.apeChain,
      wethTokenByChain.apeChain,
    ],
  },
  {
    sourceChain: 'base',
    destinationChain: 'superposition',
    expectedSourceToken: ethTokenExpectation,
    expectedDestinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      usdcTokenByChain.superposition,
      {
        ...wethTokenByChain.superposition,
        logoURI: wethSuperpositionRowTokenExpectation.logoURI,
      },
    ],
  },
  {
    sourceChain: 'base',
    destinationChain: 'arbitrum-one',
    expectedSourceToken: ethTokenExpectation,
    expectedDestinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      usdcTokenByChain.arbitrumOne,
      {
        ...usdtTokenByChain.arbitrumOne,
        logoURI: usdtArbitrumOneRowTokenExpectation.logoURI,
      },
      {
        ...wethTokenByChain.arbitrumOne,
        logoURI:
          'https://static.debank.com/image/era_token/logo_url/0x5aea5775959fbc2557cc8789bc1bf90a239d9a91/61844453e63cf81301f845d7864236f6.png',
      },
    ],
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'apechain',
    expectedSourceToken: apeTokenExpectation,
    expectedDestinationToken: apeTokenExpectation,
    expectedSourcePanelTokens: [nativeApeTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeApeTokenExpectation,
      usdcTokenByChain.apeChain,
      usdtTokenByChain.apeChain,
      wethTokenByChain.apeChain,
    ],
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'superposition',
    expectedSourceToken: ethTokenExpectation,
    expectedDestinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      usdcTokenByChain.superposition,
      wethTokenByChain.superposition,
    ],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'arbitrum-one',
    expectedSourceToken: apeTokenExpectation,
    expectedDestinationToken: apeTokenExpectation,
    expectedSourcePanelTokens: [nativeApeTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeApeTokenExpectation,
      {
        ...usdcTokenByChain.arbitrumOne,
        contract: CommonAddress.ApeChain.USDCe,
      },
      {
        ...usdtTokenByChain.arbitrumOne,
        contract: CommonAddress.ApeChain.USDT,
      },
      {
        ...wethTokenByChain.arbitrumOne,
        contract: CommonAddress.ApeChain.WETH,
      },
      nativeEthTokenExpectation,
    ],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'arbitrum-one',
    expectedSourceToken: ethTokenExpectation,
    expectedDestinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      {
        ...usdcTokenByChain.arbitrumOne,
        contract: CommonAddress.Superposition.USDCe,
      },
      {
        ...wethTokenByChain.arbitrumOne,
        contract: CommonAddress.Superposition.WETH,
      },
    ],
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceToken: apeTokenExpectation,
    expectedDestinationToken: apeTokenExpectation,
    expectedSourcePanelTokens: [nativeApeTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeApeTokenExpectation,
      usdcTokenByChain.apeChain,
      usdtTokenByChain.apeChain,
      wethTokenByChain.apeChain,
    ],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceToken: apeTokenExpectation,
    expectedDestinationToken: apeTokenExpectation,
    expectedSourcePanelTokens: [nativeApeTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeApeTokenExpectation,
      {
        ...usdcTokenByChain.ethereum,
        contract: CommonAddress.ApeChain.USDCe,
      },
      {
        ...usdtTokenByChain.ethereum,
        contract: CommonAddress.ApeChain.USDT,
      },
      {
        ...wethTokenByChain.ethereum,
        contract: CommonAddress.ApeChain.WETH,
      },
      nativeEthTokenExpectation,
    ],
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceToken: ethTokenExpectation,
    expectedDestinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      usdcTokenByChain.superposition,
      {
        ...wethTokenByChain.superposition,
        logoURI: wethSuperpositionRowTokenExpectation.logoURI,
      },
    ],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceToken: ethTokenExpectation,
    expectedDestinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      {
        ...usdcTokenByChain.ethereum,
        contract: CommonAddress.Superposition.USDCe,
      },
      {
        ...wethTokenByChain.ethereum,
        logoURI: wethSuperpositionRowTokenExpectation.logoURI,
        contract: CommonAddress.Superposition.WETH,
      },
    ],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceToken: apeTokenExpectation,
    expectedDestinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeApeTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      usdcTokenByChain.apeChain,
      {
        ...wethTokenByChain.superposition,
        contract: CommonAddress.ApeChain.WETH,
      },
    ],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceToken: ethTokenExpectation,
    expectedDestinationToken: wethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      wethTokenByChain.apeChain,
      nativeApeTokenExpectation,
      usdcTokenByChain.apeChain,
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
      expectedSourceToken,
      expectedDestinationToken,
      expectedSourcePanelTokens,
      expectedDestinationPanelTokens,
    }) => {
      await renderTransferPanel({
        sourceChain,
        destinationChain,
      });

      await expectTokenButtonToken({
        isDestination: false,
        tokenExpectation: expectedSourceToken,
      });
      await expectTokenButtonToken({
        isDestination: true,
        tokenExpectation: expectedDestinationToken,
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
