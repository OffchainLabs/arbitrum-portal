import { describe, it } from 'vitest';

import {
  type RouteTokenCase,
  type TokenPanelExpectations,
  apeTokenByChain,
  nativeApeTokenExpectation,
  nativeEthTokenExpectation,
  runTransferPanelScenario,
  setupTransferPanelLifiIntegrationSuite,
  usdcTokenByChain,
  usdtTokenByChain,
  wethTokenByChain,
} from './TransferPanel.integration.helpers';

type DefaultTokenPanelCase = {
  sourceChain: RouteTokenCase['sourceChain'];
  destinationChain: RouteTokenCase['destinationChain'];
  expectedSourcePanelTokens: TokenPanelExpectations;
  expectedDestinationPanelTokens: TokenPanelExpectations;
};

const defaultTokenPanelCases: DefaultTokenPanelCase[] = [
  {
    sourceChain: 'base',
    destinationChain: 'apechain',
    expectedSourcePanelTokens: [apeTokenByChain.base],
    expectedDestinationPanelTokens: [
      nativeApeTokenExpectation,
      usdcTokenByChain.apeChain,
      usdtTokenByChain.apeChain,
      wethTokenByChain.apeChain,
    ],
  },
  {
    sourceChain: 'base',
    destinationChain: 'superposition',
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      usdcTokenByChain.superposition,
      wethTokenByChain.superposition,
    ],
  },
  {
    sourceChain: 'base',
    destinationChain: 'arbitrum-one',
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      usdcTokenByChain.arbitrumOne,
      usdtTokenByChain.arbitrumOne,
      wethTokenByChain.arbitrumOne,
    ],
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'apechain',
    expectedSourcePanelTokens: [apeTokenByChain.arbitrumOne],
    expectedDestinationPanelTokens: [
      nativeApeTokenExpectation,
      usdcTokenByChain.apeChain,
      usdtTokenByChain.apeChain,
      wethTokenByChain.apeChain,
    ],
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'superposition',
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      usdcTokenByChain.superposition,
      wethTokenByChain.superposition,
    ],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'arbitrum-one',
    expectedSourcePanelTokens: [nativeApeTokenExpectation],
    expectedDestinationPanelTokens: [
      apeTokenByChain.arbitrumOne,
      usdcTokenByChain.arbitrumOne,
      usdtTokenByChain.arbitrumOne,
      wethTokenByChain.arbitrumOne,
      nativeEthTokenExpectation,
    ],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'arbitrum-one',
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      usdcTokenByChain.arbitrumOne,
      wethTokenByChain.arbitrumOne,
    ],
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourcePanelTokens: [apeTokenByChain.ethereum],
    expectedDestinationPanelTokens: [
      nativeApeTokenExpectation,
      usdcTokenByChain.apeChain,
      usdtTokenByChain.apeChain,
      wethTokenByChain.apeChain,
    ],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourcePanelTokens: [nativeApeTokenExpectation],
    expectedDestinationPanelTokens: [
      apeTokenByChain.ethereum,
      usdcTokenByChain.ethereum,
      usdtTokenByChain.ethereum,
      wethTokenByChain.ethereum,
      nativeEthTokenExpectation,
    ],
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      usdcTokenByChain.superposition,
      wethTokenByChain.superposition,
    ],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      usdcTokenByChain.ethereum,
      wethTokenByChain.ethereum,
    ],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourcePanelTokens: [nativeApeTokenExpectation],
    expectedDestinationPanelTokens: [
      nativeEthTokenExpectation,
      usdcTokenByChain.superposition,
      wethTokenByChain.superposition,
    ],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourcePanelTokens: [nativeEthTokenExpectation],
    expectedDestinationPanelTokens: [
      wethTokenByChain.apeChain,
      nativeApeTokenExpectation,
      usdcTokenByChain.apeChain,
    ],
  },
];

const defaultTokenCases: RouteTokenCase[] = defaultTokenPanelCases.map(
  ({
    sourceChain,
    destinationChain,
    expectedSourcePanelTokens,
    expectedDestinationPanelTokens,
  }) => ({
    sourceChain,
    destinationChain,
    expectedSourceToken: expectedSourcePanelTokens[0],
    expectedDestinationToken: expectedDestinationPanelTokens[0],
  }),
);

describe.sequential('TransferPanel LiFi Integration - Default Token', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(defaultTokenCases)(
    'renders expected source and destination tokens for default token transfer: $sourceChain -> $destinationChain',
    async ({ sourceChain, destinationChain, expectedSourceToken, expectedDestinationToken }) => {
      await runTransferPanelScenario({
        sourceChain,
        destinationChain,
        expectedSourceToken,
        expectedDestinationToken,
      });
    },
  );

  it.each(defaultTokenPanelCases)(
    'opens source and destination token panels with expected entries for default token transfer: $sourceChain -> $destinationChain',
    async ({
      sourceChain,
      destinationChain,
      expectedSourcePanelTokens,
      expectedDestinationPanelTokens,
    }) => {
      await runTransferPanelScenario({
        sourceChain,
        destinationChain,
        expectedSourceToken: expectedSourcePanelTokens[0],
        expectedDestinationToken: expectedDestinationPanelTokens[0],
        expectedSourcePanelTokens,
        expectedDestinationPanelTokens,
      });
    },
  );
});
