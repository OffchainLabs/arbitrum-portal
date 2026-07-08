import { describe, it } from 'vitest';

import {
  type ChainQuerySlug,
  type TokenExpectation,
  ethTokenExpectation,
  expectTokenButtonContent,
  nativeEthTokenExpectation,
  renderTransferPanel,
  setSourceToken,
  setupTransferPanelLifiIntegrationSuite,
  tokenExpectationsByChain,
  wethTokenExpectation,
} from './TransferPanel.integration.helpers';

type EthWethSelectionCase = {
  sourceChain: ChainQuerySlug;
  destinationChain: ChainQuerySlug;
  selectedSourceToken: TokenExpectation;
  sourceToken: TokenExpectation;
  destinationToken: TokenExpectation;
};

const ethWethCases: EthWethSelectionCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    selectedSourceToken: ethTokenExpectation,
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    selectedSourceToken: ethTokenExpectation,
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    selectedSourceToken: wethTokenExpectation,
    sourceToken: wethTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    selectedSourceToken: ethTokenExpectation,
    sourceToken: ethTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    selectedSourceToken: wethTokenExpectation,
    sourceToken: wethTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    selectedSourceToken: nativeEthTokenExpectation,
    sourceToken: nativeEthTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'robinhood-chain',
    selectedSourceToken: tokenExpectationsByChain.Ethereum.WETHWithRobinhoodLogo,
    sourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.WETH,
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'ethereum',
    selectedSourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    sourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.WETH,
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'robinhood-chain',
    selectedSourceToken: tokenExpectationsByChain.ArbitrumOne.WETHWithRobinhoodLogo,
    sourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.WETH,
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'arbitrum-one',
    selectedSourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    sourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.WETH,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'robinhood-chain',
    selectedSourceToken: tokenExpectationsByChain.Superposition.WETHWithSuperpositionLogo,
    sourceToken: tokenExpectationsByChain.Superposition.WETHWithSuperpositionLogo,
    destinationToken: tokenExpectationsByChain.Superposition.WETHWithSuperpositionLogo,
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'superposition',
    selectedSourceToken: tokenExpectationsByChain.RobinhoodChain.WETHWithSuperpositionLogo,
    sourceToken: tokenExpectationsByChain.RobinhoodChain.WETHWithSuperpositionLogo,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.WETHWithSuperpositionLogo,
  },
];

async function assertEthWethSelection({
  sourceChain,
  destinationChain,
  selectedSourceToken,
  sourceToken,
  destinationToken,
}: EthWethSelectionCase) {
  await renderTransferPanel({
    sourceChain,
    destinationChain,
  });

  await setSourceToken(selectedSourceToken);

  await expectTokenButtonContent({
    isDestination: false,
    tokenExpectation: sourceToken,
  });
  await expectTokenButtonContent({
    isDestination: true,
    tokenExpectation: destinationToken,
  });
}

describe.sequential('TransferPanel LiFi Integration - ETH/WETH Override', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(ethWethCases)(
    'renders expected source and destination tokens for ETH/WETH override: $sourceChain -> $destinationChain',
    assertEthWethSelection,
  );
});
