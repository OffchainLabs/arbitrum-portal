import { constants } from 'ethers';
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

const swapCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceSymbol: 'USDC',
    expectedDestinationSymbol: 'WETH',
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceSymbol: 'USDC.e',
    expectedDestinationSymbol: 'ETH',
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceSymbol: 'USDC',
    expectedDestinationSymbol: 'ETH',
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceSymbol: 'USDC.e',
    expectedDestinationSymbol: 'ETH',
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceSymbol: 'USDC.e',
    expectedDestinationSymbol: 'ETH',
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceSymbol: 'USDC.e',
    expectedDestinationSymbol: 'WETH',
  },
];

describe.sequential('TransferPanel LiFi Integration - Swap (USDC -> ETH/WETH)', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(swapCases)(
    'renders source $expectedSourceSymbol and destination $expectedDestinationSymbol for swap (USDC -> ETH/WETH): $sourceChain -> $destinationChain',
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
        destinationToken: constants.AddressZero,
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
