import { describe, it } from 'vitest';

import { ETHER_TOKEN_LOGO } from '@/bridge/constants';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

import {
  APE_TOKEN_LOGO,
  type RouteTokenCase,
  type TokenExpectation,
  USDC_TOKEN_LOGO,
  WETH_TOKEN_LOGO,
  runTransferPanelScenario,
  setupTransferPanelLifiIntegrationSuite,
} from './TransferPanel.integration.helpers';

const APE_LOGO_URI = APE_TOKEN_LOGO;
const WETH_LOGO_URI = WETH_TOKEN_LOGO;

const defaultTokenCases: RouteTokenCase[] = [
  {
    sourceChain: 'base',
    destinationChain: 'apechain',
    expectedSourceToken: { symbol: 'APE' },
    expectedDestinationToken: { symbol: 'APE' },
  },
  {
    sourceChain: 'base',
    destinationChain: 'superposition',
    expectedSourceToken: { symbol: 'ETH' },
    expectedDestinationToken: { symbol: 'ETH' },
  },
  {
    sourceChain: 'base',
    destinationChain: 'arbitrum-one',
    expectedSourceToken: { symbol: 'ETH' },
    expectedDestinationToken: { symbol: 'ETH' },
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'apechain',
    expectedSourceToken: { symbol: 'APE' },
    expectedDestinationToken: { symbol: 'APE' },
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'superposition',
    expectedSourceToken: { symbol: 'ETH' },
    expectedDestinationToken: { symbol: 'ETH' },
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'arbitrum-one',
    expectedSourceToken: { symbol: 'APE' },
    expectedDestinationToken: { symbol: 'APE' },
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'arbitrum-one',
    expectedSourceToken: { symbol: 'ETH' },
    expectedDestinationToken: { symbol: 'ETH' },
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceToken: { symbol: 'APE' },
    expectedDestinationToken: { symbol: 'APE' },
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceToken: { symbol: 'APE' },
    expectedDestinationToken: { symbol: 'APE' },
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceToken: { symbol: 'ETH' },
    expectedDestinationToken: { symbol: 'ETH' },
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceToken: { symbol: 'ETH' },
    expectedDestinationToken: { symbol: 'ETH' },
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceToken: { symbol: 'APE' },
    expectedDestinationToken: { symbol: 'ETH' },
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceToken: { symbol: 'ETH' },
    expectedDestinationToken: { symbol: 'WETH' },
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
      { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO, contract: 'native' },
      { symbol: 'USDC.e', logoURI: USDC_TOKEN_LOGO, contract: CommonAddress.Superposition.USDCe },
      {
        symbol: 'WETH',
        logoURI: WETH_TOKEN_LOGO,
        contract: '0x1fb719f10b56d7a85dcd32f27f897375fb21cfdd',
      },
    ],
  },
  {
    sourceChain: 'base',
    destinationChain: 'arbitrum-one',
    expectedSourcePanelSymbols: [{ symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO }],
    expectedDestinationPanelSymbols: [
      { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO, contract: 'native' },
      { symbol: 'USDC', contract: CommonAddress.ArbitrumOne.USDC },
      { symbol: 'USDT', contract: CommonAddress.ArbitrumOne.USDT },
      { symbol: 'WETH', contract: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1' },
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
      { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO, contract: 'native' },
      { symbol: 'USDC.e', contract: CommonAddress.Superposition.USDCe },
      { symbol: 'WETH', contract: '0x1fb719f10b56d7a85dcd32f27f897375fb21cfdd' },
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
      { symbol: 'USDC', contract: CommonAddress.ArbitrumOne.USDC },
      { symbol: 'USDT', contract: CommonAddress.ArbitrumOne.USDT },
      { symbol: 'WETH', contract: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1' },
      { symbol: 'ETH', contract: 'native' },
    ],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'arbitrum-one',
    expectedSourcePanelSymbols: [{ symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO }],
    expectedDestinationPanelSymbols: [
      { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO, contract: 'native' },
      { symbol: 'USDC', contract: CommonAddress.ArbitrumOne.USDC },
      { symbol: 'WETH', contract: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1' },
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
      { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO, contract: 'native' },
      { symbol: 'USDC.e', contract: CommonAddress.Superposition.USDCe },
      { symbol: 'WETH', contract: '0x1fb719f10b56d7a85dcd32f27f897375fb21cfdd' },
    ],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourcePanelSymbols: [{ symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO }],
    expectedDestinationPanelSymbols: [
      { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO, contract: 'native' },
      { symbol: 'USDC', contract: CommonAddress.Ethereum.USDC },
      { symbol: 'WETH', contract: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
    ],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourcePanelSymbols: [{ symbol: 'APE', logoURI: APE_LOGO_URI }],
    expectedDestinationPanelSymbols: [
      { symbol: 'ETH', logoURI: ETHER_TOKEN_LOGO, contract: 'native' },
      { symbol: 'USDC.e', logoURI: USDC_TOKEN_LOGO, contract: CommonAddress.Superposition.USDCe },
      {
        symbol: 'WETH',
        logoURI: WETH_TOKEN_LOGO,
        contract: '0x1fb719f10b56d7a85dcd32f27f897375fb21cfdd',
      },
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
      expectedSourcePanelSymbols,
      expectedDestinationPanelSymbols,
    }) => {
      const sourcePanelTokenExpectation = expectedSourcePanelSymbols[0];
      const destinationPanelTokenExpectation = expectedDestinationPanelSymbols[0];

      if (!sourcePanelTokenExpectation || !destinationPanelTokenExpectation) {
        throw new Error(
          `Missing primary token expectation for "${sourceChain}" -> "${destinationChain}".`,
        );
      }

      await runTransferPanelScenario({
        sourceChain,
        destinationChain,
        expectedSourceToken: sourcePanelTokenExpectation,
        expectedDestinationToken: destinationPanelTokenExpectation,
        expectedSourcePanelTokens: expectedSourcePanelSymbols,
        expectedDestinationPanelTokens: expectedDestinationPanelSymbols,
      });
    },
  );
});
