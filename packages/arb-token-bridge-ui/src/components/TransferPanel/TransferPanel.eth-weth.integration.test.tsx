import { constants } from 'ethers';
import { describe, it } from 'vitest';

import {
  type RouteTokenCase,
  expectTokenButtonSymbol,
  expectTokenPanelSymbol,
  nonConnectedDestinationAddress,
  renderTransferPanel,
  setupTransferPanelLifiIntegrationSuite,
} from './TransferPanel.integration.helpers';

const ethWethCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceSymbol: 'APE',
    expectedDestinationSymbol: 'WETH',
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceSymbol: 'APE',
    expectedDestinationSymbol: 'ETH',
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceSymbol: 'ETH',
    expectedDestinationSymbol: 'ETH',
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceSymbol: 'ETH',
    expectedDestinationSymbol: 'ETH',
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceSymbol: 'APE',
    expectedDestinationSymbol: 'ETH',
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceSymbol: 'ETH',
    expectedDestinationSymbol: 'WETH',
  },
];

describe.sequential('TransferPanel LiFi Integration - ETH/WETH Override', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(ethWethCases)(
    'renders source $expectedSourceSymbol and destination $expectedDestinationSymbol for ETH/WETH override: $sourceChain -> $destinationChain',
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
        destinationToken: constants.AddressZero,
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
