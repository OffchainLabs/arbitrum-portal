import { describe, it } from 'vitest';

import {
  type RouteTokenCase,
  expectTokenButtonContent,
  nativeEthTokenExpectation,
  renderTransferPanel,
  setDestinationToken,
  setSourceToken,
  setupTransferPanelLifiIntegrationSuite,
  tokenExpectationsByChain,
} from './TransferPanel.integration.helpers';

const swapCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    sourceToken: tokenExpectationsByChain.Ethereum.USDC,
    destinationToken: tokenExpectationsByChain.ApeChain.WETH,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    sourceToken: tokenExpectationsByChain.ApeChain.USDCe,
    destinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    sourceToken: tokenExpectationsByChain.Ethereum.USDC,
    destinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    sourceToken: tokenExpectationsByChain.Superposition.USDCe,
    destinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    sourceToken: tokenExpectationsByChain.ApeChain.USDCe,
    destinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    sourceToken: tokenExpectationsByChain.Superposition.USDCe,
    destinationToken: tokenExpectationsByChain.ApeChain.WETH,
  },
];

/**
 * Robinhood Chain is ETH-native and not yet live on LiFi. These deposit cases
 * (stablecoin -> ETH) mirror the swaps above; remove `.skip` to run them once
 * the chain is live. ApeChain <> Robinhood is intentionally omitted for now,
 * and Robinhood -> Base is not a supported route.
 */
const robinhoodSwapCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'robinhood-chain',
    sourceToken: tokenExpectationsByChain.Ethereum.USDC,
    destinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'robinhood-chain',
    sourceToken: tokenExpectationsByChain.ArbitrumOne.USDC,
    destinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'robinhood-chain',
    sourceToken: tokenExpectationsByChain.Superposition.USDCe,
    destinationToken: nativeEthTokenExpectation,
  },
];

async function assertSwapRouteTokens({
  sourceChain,
  destinationChain,
  sourceToken,
  destinationToken,
}: RouteTokenCase) {
  await renderTransferPanel({
    sourceChain,
    destinationChain,
  });

  await setSourceToken(sourceToken);
  await setDestinationToken(destinationToken);

  await expectTokenButtonContent({
    isDestination: false,
    tokenExpectation: sourceToken,
  });

  await expectTokenButtonContent({
    isDestination: true,
    tokenExpectation: destinationToken,
  });
}

describe.sequential('TransferPanel LiFi Integration - Swap (USDC -> ETH/WETH)', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(swapCases)(
    'renders expected source and destination tokens for swap (USDC -> ETH/WETH): $sourceChain -> $destinationChain',
    assertSwapRouteTokens,
  );

  // Enable once Robinhood Chain is live on LiFi (see robinhoodSwapCases note).
  it.skip.each(robinhoodSwapCases)(
    'renders expected source and destination tokens for Robinhood swap (USDC -> ETH): $sourceChain -> $destinationChain',
    assertSwapRouteTokens,
  );
});
