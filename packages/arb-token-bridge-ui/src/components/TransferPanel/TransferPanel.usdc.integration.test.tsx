import { describe, it } from 'vitest';

import {
  type RouteTokenCase,
  expectTokenButtonContent,
  renderTransferPanel,
  setDestinationToken,
  setSourceToken,
  setupTransferPanelLifiIntegrationSuite,
  tokenExpectationsByChain,
} from './TransferPanel.integration.helpers';

const usdcCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    sourceToken: tokenExpectationsByChain.Ethereum.USDC,
    destinationToken: tokenExpectationsByChain.ApeChain.USDCe,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    sourceToken: tokenExpectationsByChain.ApeChain.USDCe,
    destinationToken: tokenExpectationsByChain.Ethereum.USDC,
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    sourceToken: tokenExpectationsByChain.Ethereum.USDC,
    destinationToken: tokenExpectationsByChain.Superposition.USDCe,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    sourceToken: tokenExpectationsByChain.Superposition.USDCe,
    destinationToken: tokenExpectationsByChain.Ethereum.USDC,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    sourceToken: tokenExpectationsByChain.ApeChain.USDCe,
    destinationToken: tokenExpectationsByChain.Superposition.USDCe,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    sourceToken: tokenExpectationsByChain.Superposition.USDCe,
    destinationToken: tokenExpectationsByChain.ApeChain.USDCe,
  },
];

/**
 * Robinhood Chain is not yet live on LiFi and its native-USDC address is still a
 * placeholder (see CommonAddress.RobinhoodChain.USDC) — Robinhood uses USDC, not
 * USDC.e. Fill in the real address and remove `.skip` once the chain is live.
 * ApeChain <> Robinhood
 * is intentionally omitted for now, and Robinhood -> Base is not a supported
 * route.
 */
const robinhoodUsdcCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'robinhood-chain',
    sourceToken: tokenExpectationsByChain.Ethereum.USDC,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.USDC,
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'ethereum',
    sourceToken: tokenExpectationsByChain.RobinhoodChain.USDC,
    destinationToken: tokenExpectationsByChain.Ethereum.USDC,
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'robinhood-chain',
    sourceToken: tokenExpectationsByChain.ArbitrumOne.USDC,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.USDC,
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'arbitrum-one',
    sourceToken: tokenExpectationsByChain.RobinhoodChain.USDC,
    destinationToken: tokenExpectationsByChain.ArbitrumOne.USDC,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'robinhood-chain',
    sourceToken: tokenExpectationsByChain.Superposition.USDCe,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.USDC,
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'superposition',
    sourceToken: tokenExpectationsByChain.RobinhoodChain.USDC,
    destinationToken: tokenExpectationsByChain.Superposition.USDCe,
  },
];

async function assertUsdcRouteTokens({
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

describe.sequential('TransferPanel LiFi Integration - USDC', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(usdcCases)(
    'renders expected source and destination tokens for USDC transfer: $sourceChain -> $destinationChain',
    assertUsdcRouteTokens,
  );

  // Enable once Robinhood Chain is live on LiFi (see robinhoodUsdcCases note).
  it.skip.each(robinhoodUsdcCases)(
    'renders expected source and destination tokens for Robinhood USDC transfer: $sourceChain -> $destinationChain',
    assertUsdcRouteTokens,
  );
});
