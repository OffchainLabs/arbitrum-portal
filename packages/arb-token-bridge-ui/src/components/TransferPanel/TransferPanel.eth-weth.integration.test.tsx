import { constants } from 'ethers';
import { describe, it } from 'vitest';

import {
  type RouteTokenCase,
  runTransferPanelScenario,
  setupTransferPanelLifiIntegrationSuite,
} from './TransferPanel.integration.helpers';

const ethWethCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceToken: { symbol: 'APE' },
    expectedDestinationToken: { symbol: 'WETH' },
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceToken: { symbol: 'APE' },
    expectedDestinationToken: { symbol: 'ETH' },
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceToken: { symbol: 'ETH' },
    expectedDestinationToken: { symbol: 'ETH' },
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceToken: { symbol: 'ETH' },
    expectedDestinationToken: { symbol: 'ETH' },
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceToken: { symbol: 'APE' },
    expectedDestinationToken: { symbol: 'ETH' },
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceToken: { symbol: 'ETH' },
    expectedDestinationToken: { symbol: 'WETH' },
  },
];

describe.sequential('TransferPanel LiFi Integration - ETH/WETH Override', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(ethWethCases)(
    'renders expected source and destination tokens for ETH/WETH override: $sourceChain -> $destinationChain',
    async ({ sourceChain, destinationChain, expectedSourceToken, expectedDestinationToken }) => {
      await runTransferPanelScenario({
        sourceChain,
        destinationChain,
        expectedSourceToken,
        expectedDestinationToken,
        destinationToken: constants.AddressZero,
      });
    },
  );
});
