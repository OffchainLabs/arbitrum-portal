import { describe, it } from 'vitest';

import {
  type RouteTokenCase,
  expectTokenButtonToken,
  renderTransferPanel,
  setDestinationToken,
  setSourceToken,
  setupTransferPanelLifiIntegrationSuite,
  usdcTokenByChain,
} from './TransferPanel.integration.helpers';

const usdcCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceToken: usdcTokenByChain.ethereum,
    expectedDestinationToken: usdcTokenByChain.apeChain,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceToken: usdcTokenByChain.apeChain,
    expectedDestinationToken: usdcTokenByChain.ethereum,
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceToken: usdcTokenByChain.ethereum,
    expectedDestinationToken: usdcTokenByChain.superposition,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceToken: usdcTokenByChain.superposition,
    expectedDestinationToken: usdcTokenByChain.ethereum,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceToken: usdcTokenByChain.apeChain,
    expectedDestinationToken: usdcTokenByChain.superposition,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceToken: usdcTokenByChain.superposition,
    expectedDestinationToken: usdcTokenByChain.apeChain,
  },
];

describe.sequential('TransferPanel LiFi Integration - USDC', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(usdcCases)(
    'renders expected source and destination tokens for USDC transfer: $sourceChain -> $destinationChain',
    async ({ sourceChain, destinationChain, expectedSourceToken, expectedDestinationToken }) => {
      await renderTransferPanel({
        sourceChain,
        destinationChain,
      });

      await setSourceToken(expectedSourceToken);
      await setDestinationToken(expectedDestinationToken);

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
