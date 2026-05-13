import { describe, it } from 'vitest';

import {
  type ChainQuerySlug,
  ethTokenExpectation,
  expectTokenButtonContent,
  nativeEthTokenExpectation,
  renderTransferPanel,
  setSourceToken,
  setupTransferPanelLifiIntegrationSuite,
  wethTokenExpectation,
} from './TransferPanel.integration.helpers';

type EthWethSelectionCase = {
  sourceChain: ChainQuerySlug;
  destinationChain: ChainQuerySlug;
  selectedSourceToken: typeof ethTokenExpectation | typeof wethTokenExpectation;
  sourceToken: typeof ethTokenExpectation | typeof wethTokenExpectation;
  destinationToken: typeof nativeEthTokenExpectation | typeof wethTokenExpectation;
};

const ethWethCases: EthWethSelectionCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    selectedSourceToken: ethTokenExpectation,
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    selectedSourceToken: ethTokenExpectation,
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    selectedSourceToken: wethTokenExpectation,
    sourceToken: wethTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    selectedSourceToken: ethTokenExpectation,
    sourceToken: ethTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    selectedSourceToken: wethTokenExpectation,
    sourceToken: wethTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    selectedSourceToken: nativeEthTokenExpectation,
    sourceToken: nativeEthTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
];

describe.sequential('TransferPanel LiFi Integration - ETH/WETH Override', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(ethWethCases)(
    'renders expected source and destination tokens for ETH/WETH override: $sourceChain -> $destinationChain',
    async ({
      sourceChain,
      destinationChain,
      selectedSourceToken,
      sourceToken,
      destinationToken,
    }) => {
      await renderTransferPanel({
        sourceChain,
        destinationChain,
      });

      await setSourceToken(selectedSourceToken);

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
