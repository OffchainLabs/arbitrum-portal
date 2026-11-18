// Default token cases for the TransferPanel.default-tokens*.integration.test.tsx files. They run
// one at a time, so they are split across files that CI runs in parallel.
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
  /** Leading rows of the source panel, for routes that pin tokens. */
  expectedSourcePanelOrder?: string[];
  /** Leading rows of the destination panel, for chains that pin tokens. */
  expectedDestinationPanelOrder?: string[];
};

// The Ethereum pair falls back to Ethereum's logo; the Robinhood pair uses Robinhood's logo.
const ethereumUsdgTokenExpectation = {
  ...tokenExpectationsByChain.Ethereum.USDG,
  logoURI:
    'https://static.debank.com/image/eth_token/logo_url/0xe343167631d89b6ffc58b88d6b7fb0228795491d/4cbeae5d28b9db12bcf655fae7a328bb.png',
};
const arbitrumUsdgTokenExpectation = {
  ...tokenExpectationsByChain.RobinhoodChain.USDG,
  contract: CommonAddress.ArbitrumOne.USDG,
};
const arbitrumUsdgWithEthereumLogo = {
  ...arbitrumUsdgTokenExpectation,
  logoURI: ethereumUsdgTokenExpectation.logoURI,
};

export const defaultTokenCases: DefaultTokenCase[] = [
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
    expectedSourcePanelTokens: [nativeEthTokenExpectation, tokenExpectationsByChain.Ethereum.USDG],
    expectedSourcePanelOrder: ['ETH', 'USDG'],
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
    expectedSourcePanelTokens: [nativeEthTokenExpectation, arbitrumUsdgTokenExpectation],
    expectedSourcePanelOrder: ['ETH', 'USDG'],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      tokenExpectationsByChain.RobinhoodChain.WETH,
      tokenExpectationsByChain.RobinhoodChain.USDe,
      tokenExpectationsByChain.RobinhoodChain.USDG,
    ],
    expectedDestinationPanelOrder: ['ETH', 'USDG'],
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'arbitrum-one',
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation, ethereumUsdgTokenExpectation],
    expectedSourcePanelOrder: ['ETH', 'USDG'],
    expectedDestinationPanelTokens: [nativeEthTokenExpectation, arbitrumUsdgWithEthereumLogo],
    expectedDestinationPanelOrder: ['ETH', 'USDG'],
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'ethereum',
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
    expectedSourcePanelTokens: [nativeEthTokenExpectation, arbitrumUsdgWithEthereumLogo],
    expectedSourcePanelOrder: ['ETH', 'USDG'],
    expectedDestinationPanelTokens: [nativeEthTokenExpectation, ethereumUsdgTokenExpectation],
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
    expectedSourcePanelTokens: [
      nativeEthTokenExpectation,
      tokenExpectationsByChain.RobinhoodChain.USDG,
    ],
    expectedSourcePanelOrder: ['ETH', 'USDG'],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      {
        ...tokenExpectationsByChain.RobinhoodChain.WETH,
        contract: CommonAddress.ArbitrumOne.WETH,
      },
      arbitrumUsdgTokenExpectation,
    ],
    expectedDestinationPanelOrder: ['ETH', 'USDG'],
  },
];

export const defaultTokenCaseTitle =
  'opens source and destination token panels with expected entries for default token transfer: $sourceChain -> $destinationChain';

export async function assertDefaultTokenCase({
  sourceChain,
  destinationChain,
  sourceToken,
  destinationToken,
  expectedSourcePanelTokens,
  expectedDestinationPanelTokens,
  expectedSourcePanelOrder,
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
    symbolsInOrder: expectedSourcePanelOrder,
    tokenExpectations: expectedSourcePanelTokens,
  });
  await expectTokenPanelContent({
    isDestination: true,
    symbolsToContain: expectedDestinationPanelTokens.map(({ symbol }) => symbol),
    symbolsInOrder: expectedDestinationPanelOrder,
    tokenExpectations: expectedDestinationPanelTokens,
  });
}
