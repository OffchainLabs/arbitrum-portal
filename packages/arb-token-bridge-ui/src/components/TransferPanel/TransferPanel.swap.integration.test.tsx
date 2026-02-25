import { constants } from 'ethers';
import { describe, it } from 'vitest';

import {
  expectTokenButtonSymbol,
  expectTokenPanelSymbol,
  getUsdcSourceToken,
  nonConnectedDestinationAddress,
  renderTransferPanel,
  setupTransferPanelLifiIntegrationSuite,
  swapCases,
  usdcAddressByChain,
} from './TransferPanel.integration.helpers';

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
