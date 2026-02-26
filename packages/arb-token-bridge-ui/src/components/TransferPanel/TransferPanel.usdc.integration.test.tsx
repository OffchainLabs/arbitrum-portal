import { describe, it } from 'vitest';

import {
  type RouteTokenCase,
  expectTokenButtonSymbol,
  expectTokenPanelSymbol,
  getUsdcSourceToken,
  nonConnectedDestinationAddress,
  renderTransferPanel,
  setupTransferPanelLifiIntegrationSuite,
  usdcAddressByChain,
} from './TransferPanel.integration.helpers';

const usdcCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceSymbol: 'USDC',
    expectedDestinationSymbol: 'USDC.e',
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceSymbol: 'USDC.e',
    expectedDestinationSymbol: 'USDC',
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceSymbol: 'USDC',
    expectedDestinationSymbol: 'USDC.e',
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceSymbol: 'USDC.e',
    expectedDestinationSymbol: 'USDC',
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceSymbol: 'USDC.e',
    expectedDestinationSymbol: 'USDC.e',
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceSymbol: 'USDC.e',
    expectedDestinationSymbol: 'USDC.e',
  },
];

describe.sequential('TransferPanel LiFi Integration - USDC', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(usdcCases)(
    'renders source $expectedSourceSymbol and destination $expectedDestinationSymbol for USDC transfer: $sourceChain -> $destinationChain',
    async ({
      sourceChain,
      destinationChain,
      expectedSourceSymbol,
      expectedDestinationSymbol,
      expectedSourcePanelSymbols,
      expectedDestinationPanelSymbols,
    }) => {
      const sourceUsdcAddress = usdcAddressByChain[sourceChain];
      const sourceUsdcToken = getUsdcSourceToken(sourceChain);

      renderTransferPanel({
        sourceChain,
        destinationChain,
        token: sourceUsdcAddress,
        destinationToken: sourceUsdcAddress,
        bridgeTokens: {
          [sourceUsdcAddress.toLowerCase()]: sourceUsdcToken,
        },
        destinationAddress: nonConnectedDestinationAddress,
      });

      await expectTokenButtonSymbol({
        isDestination: false,
        symbol: expectedSourceSymbol,
      });
      await expectTokenButtonSymbol({
        isDestination: true,
        symbol: expectedDestinationSymbol,
      });

      if (expectedSourcePanelSymbols) {
        await expectTokenPanelSymbol({
          isDestination: false,
          symbolsToContain: expectedSourcePanelSymbols,
        });
      }
      if (expectedDestinationPanelSymbols) {
        await expectTokenPanelSymbol({
          isDestination: true,
          symbolsToContain: expectedDestinationPanelSymbols,
        });
      }
    },
  );
});
