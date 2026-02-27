import { constants } from 'ethers';
import { describe, it } from 'vitest';

import {
  type RouteTokenCase,
  expectTokenButtonToken,
  getUsdcSourceToken,
  nonConnectedDestinationAddress,
  renderTransferPanel,
  setupTransferPanelLifiIntegrationSuite,
  usdcAddressByChain,
} from './TransferPanel.integration.helpers';

const swapCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceToken: { symbol: 'USDC' },
    expectedDestinationToken: { symbol: 'WETH' },
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceToken: { symbol: 'USDC.e' },
    expectedDestinationToken: { symbol: 'ETH' },
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceToken: { symbol: 'USDC' },
    expectedDestinationToken: { symbol: 'ETH' },
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceToken: { symbol: 'USDC.e' },
    expectedDestinationToken: { symbol: 'ETH' },
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceToken: { symbol: 'USDC.e' },
    expectedDestinationToken: { symbol: 'ETH' },
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceToken: { symbol: 'USDC.e' },
    expectedDestinationToken: { symbol: 'WETH' },
  },
];

describe.sequential('TransferPanel LiFi Integration - Swap (USDC -> ETH/WETH)', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(swapCases)(
    'renders expected source and destination tokens for swap (USDC -> ETH/WETH): $sourceChain -> $destinationChain',
    async ({ sourceChain, destinationChain, expectedSourceToken, expectedDestinationToken }) => {
      const sourceUsdcAddress = usdcAddressByChain[sourceChain];
      const sourceUsdcToken = getUsdcSourceToken(sourceChain);
      await renderTransferPanel({
        sourceChain,
        destinationChain,
        token: sourceUsdcAddress,
        destinationToken: constants.AddressZero,
        bridgeTokens: {
          [sourceUsdcAddress.toLowerCase()]: sourceUsdcToken,
        },
        destinationAddress: nonConnectedDestinationAddress,
      });

      await expectTokenButtonToken({
        isDestination: false,
        tokenExpectation: expectedSourceToken,
      });
      await expectTokenButtonToken({
        isDestination: true,
        tokenExpectation: expectedDestinationToken,
      });
    },
  );
});
