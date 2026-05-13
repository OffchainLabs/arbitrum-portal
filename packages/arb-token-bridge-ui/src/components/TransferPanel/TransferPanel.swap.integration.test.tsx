import { describe, it } from 'vitest';

import {
  type RouteTokenCase,
  expectTokenButtonContent,
  nativeEthTokenExpectation,
  renderTransferPanel,
  setDestinationToken,
  setSourceToken,
  setupTransferPanelLifiIntegrationSuite,
  tokenExpectationsByChain,
} from './TransferPanel.integration.helpers';

const swapCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    sourceToken: tokenExpectationsByChain.Ethereum.USDC,
    destinationToken: tokenExpectationsByChain.ApeChain.WETH,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    sourceToken: tokenExpectationsByChain.ApeChain.USDCe,
    destinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    sourceToken: tokenExpectationsByChain.Ethereum.USDC,
    destinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    sourceToken: tokenExpectationsByChain.Superposition.USDCe,
    destinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    sourceToken: tokenExpectationsByChain.ApeChain.USDCe,
    destinationToken: nativeEthTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    sourceToken: tokenExpectationsByChain.Superposition.USDCe,
    destinationToken: tokenExpectationsByChain.ApeChain.WETH,
  },
];

describe.sequential('TransferPanel LiFi Integration - Swap (USDC -> ETH/WETH)', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(swapCases)(
    'renders expected source and destination tokens for swap (USDC -> ETH/WETH): $sourceChain -> $destinationChain',
    async ({ sourceChain, destinationChain, sourceToken, destinationToken }) => {
      await renderTransferPanel({
        sourceChain,
        destinationChain,
      });

      await setSourceToken(sourceToken);
      await setDestinationToken(destinationToken);

      await expectTokenButtonContent({
        isDestination: false,
        tokenExpectation: sourceToken,
      });

      await expectTokenButtonContent({
        isDestination: true,
        tokenExpectation: destinationToken,
      });
    },
  );
});
