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
});
