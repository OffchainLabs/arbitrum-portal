import { describe, it } from 'vitest';

import {
  type RouteTokenCase,
  expectTokenButtonSymbol,
  expectTokenPanelSymbol,
  nonConnectedDestinationAddress,
  renderTransferPanel,
  setupTransferPanelLifiIntegrationSuite,
} from './TransferPanel.integration.helpers';

const defaultTokenCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceSymbol: 'APE',
    expectedDestinationSymbol: 'APE',
    expectedSourcePanelSymbols: ['APE'],
    expectedDestinationPanelSymbols: ['APE', 'USDC.e', 'USDT', 'WETH'],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceSymbol: 'APE',
    expectedDestinationSymbol: 'APE',
    expectedSourcePanelSymbols: ['APE'],
    expectedDestinationPanelSymbols: ['APE', 'USDC', 'USDT', 'WETH', 'ETH'],
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceSymbol: 'ETH',
    expectedDestinationSymbol: 'ETH',
    expectedSourcePanelSymbols: ['ETH'],
    expectedDestinationPanelSymbols: ['ETH', 'USDC.e', 'WETH'],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceSymbol: 'ETH',
    expectedDestinationSymbol: 'ETH',
    expectedSourcePanelSymbols: ['ETH'],
    expectedDestinationPanelSymbols: ['ETH', 'USDC', 'WETH'],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceSymbol: 'APE',
    expectedDestinationSymbol: 'ETH',
    expectedSourcePanelSymbols: ['APE'],
    expectedDestinationPanelSymbols: ['ETH', 'USDC.e', 'WETH'],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceSymbol: 'ETH',
    expectedDestinationSymbol: 'APE',
    expectedSourcePanelSymbols: ['ETH'],
    expectedDestinationPanelSymbols: ['APE', 'USDC.e', 'WETH'],
  },
];

describe.sequential('TransferPanel LiFi Integration - Default Token', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(defaultTokenCases)(
    'renders source $expectedSourceSymbol and destination $expectedDestinationSymbol for default token transfer: $sourceChain -> $destinationChain',
    async ({
      sourceChain,
      destinationChain,
      expectedSourceSymbol,
      expectedDestinationSymbol,
      expectedSourcePanelSymbols,
      expectedDestinationPanelSymbols,
    }) => {
      renderTransferPanel({
        sourceChain,
        destinationChain,
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
