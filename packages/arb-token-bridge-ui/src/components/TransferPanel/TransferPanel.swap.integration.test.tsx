import { describe, it } from 'vitest';

import {
  type RouteTokenCase,
  expectTokenButtonToken,
  nativeEthTokenExpectation,
  renderTransferPanel,
  setDestinationToken,
  setSourceToken,
  setupTransferPanelLifiIntegrationSuite,
  usdcTokenByChain,
  wethTokenByChain,
} from './TransferPanel.integration.helpers';

const swapCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceToken: usdcTokenByChain.ethereum,
    expectedDestinationToken: wethTokenByChain.apeChain,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceToken: usdcTokenByChain.apeChain,
    expectedDestinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceToken: usdcTokenByChain.ethereum,
    expectedDestinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceToken: usdcTokenByChain.superposition,
    expectedDestinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceToken: usdcTokenByChain.apeChain,
    expectedDestinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceToken: usdcTokenByChain.superposition,
    expectedDestinationToken: wethTokenByChain.apeChain,
  },
];

describe.sequential('TransferPanel LiFi Integration - Swap (USDC -> ETH/WETH)', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(swapCases)(
    'renders expected source and destination tokens for swap (USDC -> ETH/WETH): $sourceChain -> $destinationChain',
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
