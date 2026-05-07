import { describe, it } from 'vitest';

import {
  type ChainQuerySlug,
  ethTokenExpectation,
  expectTokenButtonToken,
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
  expectedSourceToken: typeof ethTokenExpectation | typeof wethTokenExpectation;
  expectedDestinationToken: typeof nativeEthTokenExpectation | typeof wethTokenExpectation;
};

const ethWethCases: EthWethSelectionCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    selectedSourceToken: ethTokenExpectation,
    expectedSourceToken: ethTokenExpectation,
    expectedDestinationToken: ethTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    selectedSourceToken: ethTokenExpectation,
    expectedSourceToken: ethTokenExpectation,
    expectedDestinationToken: ethTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    selectedSourceToken: wethTokenExpectation,
    expectedSourceToken: wethTokenExpectation,
    expectedDestinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    selectedSourceToken: ethTokenExpectation,
    expectedSourceToken: ethTokenExpectation,
    expectedDestinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    selectedSourceToken: wethTokenExpectation,
    expectedSourceToken: wethTokenExpectation,
    expectedDestinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    selectedSourceToken: nativeEthTokenExpectation,
    expectedSourceToken: nativeEthTokenExpectation,
    expectedDestinationToken: wethTokenExpectation,
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
      expectedSourceToken,
      expectedDestinationToken,
    }) => {
      await renderTransferPanel({
        sourceChain,
        destinationChain,
      });

      await setSourceToken(selectedSourceToken);

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
