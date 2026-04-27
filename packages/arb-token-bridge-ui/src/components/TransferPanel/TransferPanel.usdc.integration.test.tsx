import { describe, it } from 'vitest';

import {
  type RouteTokenCase,
  runTransferPanelScenario,
  setupTransferPanelLifiIntegrationSuite,
  usdcAddressByChain,
  usdcETokenExpectation,
  usdcTokenExpectation,
} from './TransferPanel.integration.helpers';

const usdcCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceToken: usdcTokenExpectation,
    expectedDestinationToken: usdcETokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceToken: usdcETokenExpectation,
    expectedDestinationToken: usdcTokenExpectation,
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceToken: usdcTokenExpectation,
    expectedDestinationToken: usdcETokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceToken: usdcETokenExpectation,
    expectedDestinationToken: usdcTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceToken: usdcETokenExpectation,
    expectedDestinationToken: usdcETokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceToken: usdcETokenExpectation,
    expectedDestinationToken: usdcETokenExpectation,
  },
];

describe.sequential('TransferPanel LiFi Integration - USDC', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(usdcCases)(
    'renders expected source and destination tokens for USDC transfer: $sourceChain -> $destinationChain',
    async ({ sourceChain, destinationChain, expectedSourceToken, expectedDestinationToken }) => {
      const sourceTokenAddress = usdcAddressByChain[sourceChain];
      await runTransferPanelScenario({
        sourceChain,
        destinationChain,
        expectedSourceToken,
        expectedDestinationToken,
        token: sourceTokenAddress,
        // `destinationToken` is sanitized from the source token address into the destination-chain token.
        destinationToken: sourceTokenAddress,
      });
    },
  );
});
