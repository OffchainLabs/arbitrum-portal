import { describe, it } from 'vitest';

import { ETHER_TOKEN_LOGO } from '@/bridge/constants';

import {
  type RouteTokenCase,
  type TokenExpectation,
  expectTokenButtonToken,
  expectTokenPanelContent,
  nonConnectedDestinationAddress,
  renderTransferPanel,
  setupTransferPanelLifiIntegrationSuite,
} from './TransferPanel.integration.helpers';

const APE_LOGO_URI = '/images/ApeTokenLogo.svg';

const defaultTokenCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceToken: { symbol: 'APE', logoURI: APE_LOGO_URI },
    expectedDestinationToken: { symbol: 'APE', logoURI: APE_LOGO_URI },
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceToken: { symbol: 'APE', logoURI: APE_LOGO_URI },
    expectedDestinationToken: { symbol: 'APE', logoURI: APE_LOGO_URI },
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceToken: { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
    expectedDestinationToken: { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceToken: { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
    expectedDestinationToken: { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceToken: { symbol: 'APE', logoURI: APE_LOGO_URI },
    expectedDestinationToken: { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceToken: { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
    expectedDestinationToken: {
      symbol: 'WETH',
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    },
  },
];

type DefaultTokenPanelCase = {
  sourceChain: RouteTokenCase['sourceChain'];
  destinationChain: RouteTokenCase['destinationChain'];
  expectedSourcePanelSymbols: string[];
  expectedDestinationPanelSymbols: string[];
  expectedSourcePanelToken: TokenExpectation;
  expectedDestinationPanelToken: TokenExpectation;
};

const defaultTokenPanelCases: DefaultTokenPanelCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourcePanelSymbols: ['APE'],
    expectedDestinationPanelSymbols: ['APE', 'USDC.e', 'USDT', 'WETH'],
    expectedSourcePanelToken: {
      symbol: 'APE',
    },
    expectedDestinationPanelToken: {
      symbol: 'APE',
    },
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourcePanelSymbols: ['APE'],
    expectedDestinationPanelSymbols: ['APE', 'USDC', 'USDT', 'WETH', 'ETH'],
    expectedSourcePanelToken: {
      symbol: 'APE',
    },
    expectedDestinationPanelToken: {
      symbol: 'APE',
    },
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourcePanelSymbols: ['ETH'],
    expectedDestinationPanelSymbols: ['ETH', 'USDC.e', 'WETH'],
    expectedSourcePanelToken: {
      symbol: 'ETH',
    },
    expectedDestinationPanelToken: {
      symbol: 'ETH',
    },
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourcePanelSymbols: ['ETH'],
    expectedDestinationPanelSymbols: ['ETH', 'USDC', 'WETH'],
    expectedSourcePanelToken: {
      symbol: 'ETH',
    },
    expectedDestinationPanelToken: {
      symbol: 'ETH',
    },
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourcePanelSymbols: ['APE'],
    expectedDestinationPanelSymbols: ['ETH', 'USDC.e', 'WETH'],
    expectedSourcePanelToken: {
      symbol: 'APE',
    },
    expectedDestinationPanelToken: {
      symbol: 'ETH',
    },
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourcePanelSymbols: ['ETH'],
    expectedDestinationPanelSymbols: ['APE', 'USDC.e', 'WETH'],
    expectedSourcePanelToken: {
      symbol: 'ETH',
    },
    expectedDestinationPanelToken: {
      symbol: 'APE',
    },
  },
];

describe.sequential('TransferPanel LiFi Integration - Default Token', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(defaultTokenCases)(
    'renders expected source and destination tokens for default token transfer: $sourceChain -> $destinationChain',
    async ({ sourceChain, destinationChain, expectedSourceToken, expectedDestinationToken }) => {
      await renderTransferPanel({
        sourceChain,
        destinationChain,
        destinationAddress: nonConnectedDestinationAddress,
      });

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

  it.each(defaultTokenPanelCases)(
    'opens source and destination token panels with expected entries for default token transfer: $sourceChain -> $destinationChain',
    async ({
      sourceChain,
      destinationChain,
      expectedSourcePanelSymbols,
      expectedDestinationPanelSymbols,
      expectedSourcePanelToken,
      expectedDestinationPanelToken,
    }) => {
      await renderTransferPanel({
        sourceChain,
        destinationChain,
        destinationAddress: nonConnectedDestinationAddress,
      });

      await expectTokenPanelContent({
        isDestination: false,
        symbolsToContain: expectedSourcePanelSymbols,
        tokenExpectation: expectedSourcePanelToken,
      });
      await expectTokenPanelContent({
        isDestination: true,
        symbolsToContain: expectedDestinationPanelSymbols,
        tokenExpectation: expectedDestinationPanelToken,
      });
    },
  );
});
