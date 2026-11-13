// Generates the responses of the APIs called by the render profile, see renderProfileNetwork.ts.
// The data is made up but has the shape and size of the real responses, since the cost of some
// renders depends on the number of tokens. The same inputs always give the same output.
import type { Token as LifiToken, Route } from '@lifi/sdk';
import type { TokenInfo, TokenList } from '@uniswap/token-lists';
import { utils } from 'ethers';

import { parseLifiRoute } from '../app/api/crosschain-transfers/lifi';
import type { ArbitrumStatusResponse } from '../app/api/status';
import { ChainId } from '../types/ChainId';
import { CommonAddress } from '../util/CommonAddressUtils';

type ProfileToken = {
  symbol: string;
  name: string;
  decimals: number;
  priceUSD: number;
  logoURI: string;
  // On Ethereum and on Arbitrum One
  parentAddress: string;
  childAddress: string;
};

// Sizes of the real lists, the cost of the token search and of the SWR keys grows with them
const tokenListSizes: { [file: string]: number } = {
  'arbed_arb_whitelist_era.json': 100,
  'arbed_uniswap_labs_default.json': 190,
  'arbed_coingecko.json': 668,
  'arbed_coinmarketcap.json': 830,
};
const defaultTokenListSize = 50;
const lifiTokenListSize = 189;
const layerZeroTokensPerChain = 300;

// Gateways of the tokens bridged between Ethereum and Arbitrum One
const parentGateway = '0xa3A7B6F88361F48403514059F1f16C8E78d60EeC';
const childGateway = '0x09e9222E96E7B4AE2a407B98d48e330053351EEe';
const timestamp = '2026-01-01T00:00:00.000Z';

// Deterministic pseudo-random numbers (mulberry32)
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createAddress(random: () => number) {
  const hex = Array.from({ length: 40 }, () => Math.floor(random() * 16).toString(16)).join('');
  return utils.getAddress(`0x${hex}`);
}

function wellKnownToken(
  symbol: keyof typeof CommonAddress.Ethereum & keyof typeof CommonAddress.ArbitrumOne,
  decimals: number,
  priceUSD: number,
): ProfileToken {
  return {
    symbol,
    name: symbol,
    decimals,
    priceUSD,
    logoURI: `https://assets.profile.test/tokens/${symbol.toLowerCase()}/logo.png`,
    parentAddress: CommonAddress.Ethereum[symbol],
    childAddress: CommonAddress.ArbitrumOne[symbol],
  };
}

// The tokens the flow uses come first, so they are in every list, like in the real lists
const wellKnownTokens: ProfileToken[] = [
  wellKnownToken('USDC', 6, 1),
  wellKnownToken('USDT', 6, 1),
  wellKnownToken('WETH', 18, 2500),
  wellKnownToken('WBTC', 8, 60000),
  wellKnownToken('DAI', 18, 1),
  wellKnownToken('ARB', 18, 0.5),
  wellKnownToken('USDe', 18, 1),
  wellKnownToken('APE', 18, 0.7),
];

const tokens: ProfileToken[] = (() => {
  const random = createRandom(1);
  const generated = Array.from({ length: 1_000 }, (_, index): ProfileToken => {
    const symbol = `TKN${index + 1}`;
    return {
      symbol,
      name: `Profile Token ${index + 1}`,
      decimals: random() < 0.2 ? 6 : 18,
      priceUSD: Math.round(random() * 100_000) / 100,
      logoURI: `https://assets.profile.test/coins/images/${index + 1}/thumb/${symbol.toLowerCase()}.png`,
      parentAddress: createAddress(random),
      childAddress: createAddress(random),
    };
  });
  return [...wellKnownTokens, ...generated];
})();

function getTokenAddress(token: ProfileToken, chainId: number) {
  return chainId === ChainId.Ethereum ? token.parentAddress : token.childAddress;
}

function findToken(chainId: number, address: string) {
  return tokens.find(
    (token) => getTokenAddress(token, chainId).toLowerCase() === address.toLowerCase(),
  );
}

function createTokenList(name: string, listTokens: TokenInfo[]): TokenList {
  return {
    name,
    timestamp,
    version: { major: 1, minor: 0, patch: 0 },
    logoURI: 'https://assets.profile.test/lists/logo.png',
    tokens: listTokens,
  };
}

function toBridgedTokenInfo(token: ProfileToken): TokenInfo {
  return {
    chainId: ChainId.ArbitrumOne,
    address: utils.getAddress(token.childAddress),
    name: token.name,
    symbol: token.symbol,
    decimals: token.decimals,
    logoURI: token.logoURI,
    extensions: {
      bridgeInfo: {
        [ChainId.Ethereum]: {
          tokenAddress: token.parentAddress.toLowerCase(),
          originBridgeAddress: childGateway,
          destBridgeAddress: parentGateway.toLowerCase(),
        },
      },
    },
  };
}

// Lists of https://tokenlist.arbitrum.io/ArbTokenLists, the Arbitrum One lists are prefixes of the
// same tokens, so they overlap like the real ones
export function generateArbitrumTokenList(file: string): TokenList {
  const size = tokenListSizes[file] ?? defaultTokenListSize;
  const listTokens = tokens.slice(0, size).map(toBridgedTokenInfo);
  if (file === 'arbed_arb_whitelist_era.json') {
    // This list also has the parent chain tokens
    listTokens.push(
      ...tokens.slice(0, size).map((token) => ({
        chainId: ChainId.Ethereum,
        address: utils.getAddress(token.parentAddress),
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        logoURI: token.logoURI,
      })),
    );
  }
  return createTokenList(file, listTokens);
}

// Prices move a little every 10 seconds of the fake clock, like the prices of the LiFi API
function getPriceUSD(token: ProfileToken) {
  const variation = (Math.floor(Date.now() / 10_000) % 10) / 1_000;
  return String(Math.round(token.priceUSD * (1 + variation) * 1_000_000) / 1_000_000);
}

function toLifiTokenInfo(
  token: ProfileToken,
  { parentChainId, childChainId }: { parentChainId: number; childChainId: number },
): TokenInfo {
  return {
    chainId: childChainId,
    address: utils.getAddress(token.childAddress),
    name: token.name,
    symbol: token.symbol,
    decimals: token.decimals,
    logoURI: token.logoURI,
    extensions: {
      priceUSD: getPriceUSD(token),
      bridgeInfo: {
        [parentChainId]: {
          tokenAddress: utils.getAddress(token.parentAddress),
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          logoURI: token.logoURI,
        },
      },
    },
  };
}

const ether = {
  symbol: 'ETH',
  name: 'ETH',
  decimals: 18,
  priceUSD: 2500,
  logoURI: '/images/EthereumLogoRound.svg',
  parentAddress: '0x0000000000000000000000000000000000000000',
  childAddress: '0x0000000000000000000000000000000000000000',
} satisfies ProfileToken;

// Response of /api/crosschain-transfers/lifi/tokens, only Ethereum to Arbitrum One has tokens
export function generateLifiTokenList(parentChainId: number, childChainId: number): TokenList {
  const isSupported = parentChainId === ChainId.Ethereum && childChainId === ChainId.ArbitrumOne;
  const listTokens = isSupported
    ? [ether, ...tokens.slice(0, lifiTokenListSize - 1)].map((token) =>
        toLifiTokenInfo(token, { parentChainId, childChainId }),
      )
    : [];
  return createTokenList('LiFi Transfer Tokens', listTokens);
}

// Response of /api/layerzero-metadata, keyed by chain id. USDT is the only OFT, like USDT0.
export function generateLayerZeroMetadata() {
  const chains = [
    { chainId: ChainId.Ethereum, chainKey: 'ethereum' },
    { chainId: ChainId.ArbitrumOne, chainKey: 'arbitrum' },
  ];
  return Object.fromEntries(
    chains.map(({ chainId, chainKey }) => [
      chainId,
      {
        chainKey,
        tokens: Object.fromEntries(
          tokens.slice(0, layerZeroTokensPerChain).map((token) => [
            getTokenAddress(token, chainId).toLowerCase(),
            {
              isOft: token.symbol === 'USDT',
              ...(chainId !== ChainId.Ethereum && {
                peggedTo: {
                  address: token.parentAddress.toLowerCase(),
                  chainName: 'ethereum',
                },
              }),
            },
          ]),
        ),
      },
    ]),
  );
}

function toLifiToken(chainId: number, address: string): LifiToken {
  const token = address === ether.parentAddress ? ether : (findToken(chainId, address) ?? ether);
  return {
    chainId,
    address,
    symbol: token.symbol,
    decimals: token.decimals,
    name: token.name,
    logoURI: token.logoURI,
    priceUSD: getPriceUSD(token),
  };
}

function formatUSD(amount: bigint, token: LifiToken) {
  return ((Number(amount) / 10 ** token.decimals) * Number(token.priceUSD)).toFixed(4);
}

// Response of /api/crosschain-transfers/lifi: a cheap slow route and a fast expensive one, built
// like the API builds them from the routes of the LiFi SDK
export function generateLifiRoutes(searchParams: URLSearchParams) {
  const fromChainId = Number(searchParams.get('fromChainId'));
  const toChainId = Number(searchParams.get('toChainId'));
  const fromToken = toLifiToken(fromChainId, searchParams.get('fromToken') ?? '');
  const toToken = toLifiToken(toChainId, searchParams.get('toToken') ?? '');
  const gasToken = toLifiToken(fromChainId, ether.parentAddress);
  const fromAmount = BigInt(searchParams.get('fromAmount') ?? '0');

  const routes = [
    { id: 'cheapest', tool: 'across', costBasisPoints: 5n, durationSeconds: 600 },
    { id: 'fastest', tool: 'relay', costBasisPoints: 10n, durationSeconds: 60 },
  ].map(({ id, tool, costBasisPoints, durationSeconds }) => {
    const toAmount =
      (fromAmount * (10_000n - costBasisPoints) * 10n ** BigInt(toToken.decimals)) /
      10_000n /
      10n ** BigInt(fromToken.decimals);
    const toAmountMin = ((toAmount * 995n) / 1_000n).toString();
    const action = {
      fromChainId,
      fromAmount: fromAmount.toString(),
      fromToken,
      toChainId,
      toToken,
    };
    const gasCost = {
      type: 'SEND' as const,
      price: '1000000000',
      estimate: '150000',
      limit: '200000',
      amount: '150000000000000',
      amountUSD: formatUSD(150_000_000_000_000n, gasToken),
      token: gasToken,
    };
    const estimate = {
      tool,
      fromAmount: fromAmount.toString(),
      fromAmountUSD: formatUSD(fromAmount, fromToken),
      toAmount: toAmount.toString(),
      toAmountMin,
      toAmountUSD: formatUSD(toAmount, toToken),
      approvalAddress: childGateway,
      executionDuration: durationSeconds,
      feeCosts: [],
      gasCosts: [gasCost],
    };
    const toolDetails = {
      key: tool,
      name: tool,
      logoURI: `https://assets.profile.test/bridges/${tool}.svg`,
    };
    const route: Route = {
      id,
      insurance: { state: 'NOT_INSURABLE', feeAmountUsd: '0' },
      fromChainId,
      fromAmountUSD: estimate.fromAmountUSD,
      fromAmount: fromAmount.toString(),
      fromToken,
      toChainId,
      toAmountUSD: estimate.toAmountUSD,
      toAmount: toAmount.toString(),
      toAmountMin,
      toToken,
      gasCostUSD: gasCost.amountUSD,
      containsSwitchChain: false,
      tags: [id === 'cheapest' ? 'CHEAPEST' : 'FASTEST'],
      steps: [
        {
          id: `${id}:0`,
          type: 'lifi',
          tool,
          toolDetails,
          action,
          estimate,
          includedSteps: [{ id: `${id}:0:0`, type: 'cross', tool, toolDetails, action, estimate }],
        },
      ],
    };
    return parseLifiRoute({
      route,
      fromChainId: String(fromChainId),
      toChainId: String(toChainId),
      fromAddress: searchParams.get('fromAddress') ?? undefined,
      toAddress: searchParams.get('toAddress') ?? undefined,
    });
  });

  return { data: fromAmount > 0n ? routes : [] };
}

// Response of /api/status, every chain is operational so no banner shows
export function generateArbitrumStatus(): { data: ArbitrumStatusResponse } {
  return {
    data: {
      content: {
        components: ['Arb1', 'Nova'].map((name) => ({
          id: name.toLowerCase(),
          name,
          description: '',
          status: 'OPERATIONAL',
        })),
      },
    },
  };
}
