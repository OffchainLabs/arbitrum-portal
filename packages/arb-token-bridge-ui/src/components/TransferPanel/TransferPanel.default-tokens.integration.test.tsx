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
const WETH_LOGO_URI =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png';

const defaultTokenCases: RouteTokenCase[] = [
  {
    sourceChain: 'base',
    destinationChain: 'apechain',
    expectedSourceToken: { symbol: 'APE', logoURI: APE_LOGO_URI },
    expectedDestinationToken: { symbol: 'APE', logoURI: APE_LOGO_URI },
  },
  {
    sourceChain: 'base',
    destinationChain: 'superposition',
    expectedSourceToken: { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
    expectedDestinationToken: { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
  },
  {
    sourceChain: 'base',
    destinationChain: 'arbitrum-one',
    expectedSourceToken: { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
    expectedDestinationToken: { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'apechain',
    expectedSourceToken: { symbol: 'APE', logoURI: APE_LOGO_URI },
    expectedDestinationToken: { symbol: 'APE', logoURI: APE_LOGO_URI },
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'superposition',
    expectedSourceToken: { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
    expectedDestinationToken: { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'arbitrum-one',
    expectedSourceToken: { symbol: 'APE', logoURI: APE_LOGO_URI },
    expectedDestinationToken: { symbol: 'APE', logoURI: APE_LOGO_URI },
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'arbitrum-one',
    expectedSourceToken: { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
    expectedDestinationToken: { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
  },
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
      logoURI: WETH_LOGO_URI,
    },
  },
];

type DefaultTokenPanelCase = {
  sourceChain: RouteTokenCase['sourceChain'];
  destinationChain: RouteTokenCase['destinationChain'];
  expectedSourcePanelSymbols: TokenExpectation[];
  expectedDestinationPanelSymbols: TokenExpectation[];
};

const defaultTokenPanelCases: DefaultTokenPanelCase[] = [
  {
    sourceChain: 'base',
    destinationChain: 'apechain',
    expectedSourcePanelSymbols: [
      {
        symbol: 'APE',
        logoURI: APE_LOGO_URI,
      },
    ],
    expectedDestinationPanelSymbols: [
      { symbol: 'APE', logoURI: APE_LOGO_URI },
      { symbol: 'USDC.e' },
      { symbol: 'USDT' },
      { symbol: 'WETH' },
    ],
  },
  {
    sourceChain: 'base',
    destinationChain: 'superposition',
    expectedSourcePanelSymbols: [{ symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO }],
    expectedDestinationPanelSymbols: [
      { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
      { symbol: 'USDC.e' },
      { symbol: 'WETH' },
    ],
  },
  {
    sourceChain: 'base',
    destinationChain: 'arbitrum-one',
    expectedSourcePanelSymbols: [{ symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO }],
    expectedDestinationPanelSymbols: [
      { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
      { symbol: 'USDC' },
      { symbol: 'USDT' },
      { symbol: 'WETH' },
    ],
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'apechain',
    expectedSourcePanelSymbols: [
      {
        symbol: 'APE',
        logoURI: APE_LOGO_URI,
      },
    ],
    expectedDestinationPanelSymbols: [
      { symbol: 'APE', logoURI: APE_LOGO_URI },
      { symbol: 'USDC.e' },
      { symbol: 'USDT' },
      { symbol: 'WETH' },
    ],
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'superposition',
    expectedSourcePanelSymbols: [{ symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO }],
    expectedDestinationPanelSymbols: [
      { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
      { symbol: 'USDC.e' },
      { symbol: 'WETH' },
    ],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'arbitrum-one',
    expectedSourcePanelSymbols: [{ symbol: 'APE', logoURI: APE_LOGO_URI }],
    expectedDestinationPanelSymbols: [
      {
        symbol: 'APE',
        logoURI: APE_LOGO_URI,
      },
      { symbol: 'USDC' },
      { symbol: 'USDT' },
      { symbol: 'WETH' },
      { symbol: 'ETH' },
    ],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'arbitrum-one',
    expectedSourcePanelSymbols: [{ symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO }],
    expectedDestinationPanelSymbols: [
      { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
      { symbol: 'USDC' },
      { symbol: 'WETH' },
    ],
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourcePanelSymbols: [
      {
        symbol: 'APE',
        logoURI: APE_LOGO_URI,
      },
    ],
    expectedDestinationPanelSymbols: [
      { symbol: 'APE', logoURI: APE_LOGO_URI },
      { symbol: 'USDC.e' },
      { symbol: 'USDT' },
      { symbol: 'WETH' },
    ],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourcePanelSymbols: [{ symbol: 'APE', logoURI: APE_LOGO_URI }],
    expectedDestinationPanelSymbols: [
      {
        symbol: 'APE',
        logoURI: APE_LOGO_URI,
      },
      { symbol: 'USDC' },
      { symbol: 'USDT' },
      { symbol: 'WETH' },
      { symbol: 'ETH' },
    ],
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourcePanelSymbols: [{ symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO }],
    expectedDestinationPanelSymbols: [
      { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
      { symbol: 'USDC.e' },
      { symbol: 'WETH' },
    ],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourcePanelSymbols: [{ symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO }],
    expectedDestinationPanelSymbols: [
      { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
      { symbol: 'USDC' },
      { symbol: 'WETH' },
    ],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourcePanelSymbols: [{ symbol: 'APE', logoURI: APE_LOGO_URI }],
    expectedDestinationPanelSymbols: [
      { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO },
      { symbol: 'USDC.e' },
      { symbol: 'WETH' },
    ],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourcePanelSymbols: [{ symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO }],
    expectedDestinationPanelSymbols: [
      {
        symbol: 'WETH',
        logoURI: WETH_LOGO_URI,
      },
      { symbol: 'APE' },
      { symbol: 'USDC.e' },
      { symbol: 'WETH' },
    ],
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
    }) => {
      await renderTransferPanel({
        sourceChain,
        destinationChain,
        destinationAddress: nonConnectedDestinationAddress,
      });
      const expectedSourcePanelTokenSymbols = expectedSourcePanelSymbols.map(
        ({ symbol }) => symbol,
      );
      const expectedDestinationPanelTokenSymbols = expectedDestinationPanelSymbols.map(
        ({ symbol }) => symbol,
      );
      const sourcePanelTokenExpectation = expectedSourcePanelSymbols[0];
      const destinationPanelTokenExpectation = expectedDestinationPanelSymbols[0];

      if (!sourcePanelTokenExpectation || !destinationPanelTokenExpectation) {
        throw new Error(
          `Missing primary token expectation for "${sourceChain}" -> "${destinationChain}".`,
        );
      }

      await expectTokenPanelContent({
        isDestination: false,
        symbolsToContain: expectedSourcePanelTokenSymbols,
        tokenExpectation: sourcePanelTokenExpectation,
      });
      await expectTokenPanelContent({
        isDestination: true,
        symbolsToContain: expectedDestinationPanelTokenSymbols,
        tokenExpectation: destinationPanelTokenExpectation,
      });
    },
  );
});
