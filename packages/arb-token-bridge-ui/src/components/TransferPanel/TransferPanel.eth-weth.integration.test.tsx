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
];

/**
 * Robinhood Chain is ETH-native and not yet live on LiFi (its WETH address is set
 * in CommonAddress.RobinhoodChain). These cases bridge WETH across the Robinhood
 * pairs (the Robinhood-source cases select via its WETH address). Remove `.skip`
 * once the chain is live — and double-check the expected source/destination tokens
 * against the live ETH/WETH override behavior. ApeChain <> Robinhood is omitted
 * for now and Robinhood -> Base is not a supported route.
 */
const robinhoodEthWethCases: EthWethSelectionCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'robinhood-chain',
    selectedSourceToken: tokenExpectationsByChain.Ethereum.WETH,
    sourceToken: wethTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'ethereum',
    selectedSourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    sourceToken: wethTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'robinhood-chain',
    selectedSourceToken: tokenExpectationsByChain.ArbitrumOne.WETH,
    sourceToken: wethTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'arbitrum-one',
    selectedSourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    sourceToken: wethTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'robinhood-chain',
    selectedSourceToken: tokenExpectationsByChain.Superposition.WETH,
    sourceToken: wethTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'superposition',
    selectedSourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    sourceToken: wethTokenExpectation,
    destinationToken: wethTokenExpectation,
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

  // Enable once Robinhood Chain is live on LiFi (see robinhoodEthWethCases note).
  it.skip.each(robinhoodEthWethCases)(
    'renders expected source and destination tokens for Robinhood WETH transfer: $sourceChain -> $destinationChain',
    assertEthWethSelection,
  );
});
