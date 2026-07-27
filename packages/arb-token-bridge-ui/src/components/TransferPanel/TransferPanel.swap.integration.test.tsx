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
    destinationChain: 'robinhood-chain',
    sourceToken: tokenExpectationsByChain.Ethereum.USDe,
    destinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'robinhood-chain',
    sourceToken: tokenExpectationsByChain.Ethereum.USDG,
    destinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'robinhood-chain',
    sourceToken: tokenExpectationsByChain.ArbitrumOne.USDe,
    destinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'base',
    destinationChain: 'robinhood-chain',
    sourceToken: tokenExpectationsByChain.Base.USDe,
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

describe.sequential('TransferPanel LiFi Integration - Swap', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(swapCases)(
    'renders expected source and destination tokens for swap: $sourceChain -> $destinationChain',
    assertSwapRouteTokens,
  );
});
