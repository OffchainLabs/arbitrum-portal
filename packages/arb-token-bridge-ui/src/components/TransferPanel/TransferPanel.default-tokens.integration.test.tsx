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
    ],
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
    ],
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'ethereum',
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      tokenExpectationsByChain.RobinhoodChain.WETH,
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
      tokenExpectationsByChain.RobinhoodChain.WETH,
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
    tokenExpectations: expectedDestinationPanelTokens,
  });
}

describe.sequential('TransferPanel LiFi Integration - Default Token', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(defaultTokenCases)(
    'opens source and destination token panels with expected entries for default token transfer: $sourceChain -> $destinationChain',
    assertDefaultTokenCase,
  );
});
