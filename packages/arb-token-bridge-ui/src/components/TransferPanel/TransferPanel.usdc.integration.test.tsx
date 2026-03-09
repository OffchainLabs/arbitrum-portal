import { describe, it } from 'vitest';

import {
  type RouteTokenCase,
  runTransferPanelScenario,
  setupTransferPanelLifiIntegrationSuite,
  usdcAddressByChain,
} from './TransferPanel.integration.helpers';

const usdcCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceToken: { symbol: 'USDC' },
    expectedDestinationToken: { symbol: 'USDC.e' },
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceToken: { symbol: 'USDC.e' },
    expectedDestinationToken: { symbol: 'USDC' },
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceToken: { symbol: 'USDC' },
    expectedDestinationToken: { symbol: 'USDC.e' },
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceToken: { symbol: 'USDC.e' },
    expectedDestinationToken: { symbol: 'USDC' },
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceToken: { symbol: 'USDC.e' },
    expectedDestinationToken: { symbol: 'USDC.e' },
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceToken: { symbol: 'USDC.e' },
    expectedDestinationToken: { symbol: 'USDC.e' },
  },
];

describe.sequential('TransferPanel LiFi Integration - USDC', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(usdcCases)(
    'renders expected source and destination tokens for USDC transfer: $sourceChain -> $destinationChain',
    async ({ sourceChain, destinationChain, expectedSourceToken, expectedDestinationToken }) => {
      const sourceUsdcAddress = usdcAddressByChain[sourceChain];
      await runTransferPanelScenario({
        sourceChain,
        destinationChain,
        expectedSourceToken,
        expectedDestinationToken,
        token: sourceUsdcAddress,
        destinationToken: sourceUsdcAddress,
      });
    },
  );
});
