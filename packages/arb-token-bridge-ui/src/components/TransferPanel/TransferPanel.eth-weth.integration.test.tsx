import { constants } from 'ethers';
import { describe, it } from 'vitest';

import {
  type RouteTokenCase,
  apeTokenExpectation,
  nativeApeTokenExpectation,
  nativeEthTokenExpectation,
  runTransferPanelScenario,
  setupTransferPanelLifiIntegrationSuite,
  wethTokenExpectation,
} from './TransferPanel.integration.helpers';

const ethWethCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceToken: apeTokenExpectation,
    expectedDestinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceToken: nativeApeTokenExpectation,
    expectedDestinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceToken: nativeEthTokenExpectation,
    expectedDestinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceToken: nativeEthTokenExpectation,
    expectedDestinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceToken: nativeApeTokenExpectation,
    expectedDestinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceToken: nativeEthTokenExpectation,
    expectedDestinationToken: wethTokenExpectation,
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
