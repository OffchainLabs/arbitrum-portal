import { constants } from 'ethers';
import { describe, it } from 'vitest';

import {
  type RouteTokenCase,
  nativeEthTokenExpectation,
  runTransferPanelScenario,
  setupTransferPanelLifiIntegrationSuite,
  usdcAddressByChain,
  usdcETokenExpectation,
  usdcTokenExpectation,
  wethTokenExpectation,
} from './TransferPanel.integration.helpers';

const swapCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceToken: usdcTokenExpectation,
    expectedDestinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceToken: usdcETokenExpectation,
    expectedDestinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceToken: usdcTokenExpectation,
    expectedDestinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceToken: usdcETokenExpectation,
    expectedDestinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceToken: usdcETokenExpectation,
    expectedDestinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceToken: usdcETokenExpectation,
    expectedDestinationToken: wethTokenExpectation,
  },
];

describe.sequential('TransferPanel LiFi Integration - Swap (USDC -> ETH/WETH)', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(swapCases)(
    'renders expected source and destination tokens for swap (USDC -> ETH/WETH): $sourceChain -> $destinationChain',
    async ({ sourceChain, destinationChain, expectedSourceToken, expectedDestinationToken }) => {
      const sourceTokenAddress = usdcAddressByChain[sourceChain];
      await runTransferPanelScenario({
        sourceChain,
        destinationChain,
        expectedSourceToken,
        expectedDestinationToken,
        token: sourceTokenAddress,
        destinationToken: constants.AddressZero,
      });
    },
  );
});
