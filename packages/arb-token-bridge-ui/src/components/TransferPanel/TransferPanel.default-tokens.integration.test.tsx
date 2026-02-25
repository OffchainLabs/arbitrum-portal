import { describe, it } from 'vitest';

import {
  defaultTokenCases,
  expectTokenButtonSymbol,
  expectTokenPanelSymbol,
  nonConnectedDestinationAddress,
  renderTransferPanel,
  setupTransferPanelLifiIntegrationSuite,
} from './TransferPanel.integration.helpers';

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
