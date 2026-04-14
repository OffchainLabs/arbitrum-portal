import { CoinKey } from '@lifi/sdk';
import { createPublicClient, erc20Abi, formatUnits, http, isAddress } from 'viem';
import type { Address } from 'viem';

import { lifiDestinationChainIds } from '@/bridge/app/api/crosschain-transfers/constants';
import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';
import { rpcURLs } from '@/bridge/util/networks';

import { getLifiTokenRegistry } from '../../app/api/crosschain-transfers/lifi/tokens/registry';
import type {
  BalancesResponse,
  DestinationTokensResponse,
  MappingEdge,
  MappingProvider,
  TokenGraphChain,
  TokenVariant,
  TokensResponse,
} from './types';

const UNISWAP_TOKEN_LIST_URL = 'https://tokens.uniswap.org/';
const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

const supportedChainIds = new Set([ChainId.Ethereum, ChainId.ArbitrumOne, ChainId.ApeChain]);

const providerOrder = {
  cctp: 0,
  lifi: 1,
  canonical: 2,
  oft: 3,
} as const;

const chains: TokenGraphChain[] = [
  {
    chainId: ChainId.Ethereum,
    name: 'Ethereum',
    nativeSymbol: 'ETH',
  },
  {
    chainId: ChainId.ArbitrumOne,
    name: 'Arbitrum One',
    nativeSymbol: 'ETH',
  },
  {
    chainId: ChainId.ApeChain,
    name: 'ApeChain',
    nativeSymbol: 'APE',
  },
];

export function getTokenId(chainId: number, address?: string) {
  if (!address) {
    return `${chainId}:native`;
  }

  return `${chainId}:${address.toLowerCase()}`;
}

// Native tokens (not in Uniswap list)
const nativeTokens: TokenVariant[] = [
  {
    id: getTokenId(ChainId.Ethereum),
    chainId: ChainId.Ethereum,
    tokenType: 'native',
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
    logoURI: '/images/EthereumLogoRound.svg',
    supportsSwap: true,
  },
  {
    id: getTokenId(ChainId.ArbitrumOne),
    chainId: ChainId.ArbitrumOne,
    tokenType: 'native',
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
    logoURI: '/images/EthereumLogoRound.svg',
    supportsSwap: true,
  },
  {
    id: getTokenId(ChainId.ApeChain),
    chainId: ChainId.ApeChain,
    tokenType: 'native',
    symbol: 'APE',
    name: 'ApeCoin',
    decimals: 18,
    logoURI: '/images/ApeChainLogo.svg',
    supportsSwap: true,
  },
];

// Manual contract tokens that are required even when they are absent from the list source.
const manualContractTokens: TokenVariant[] = [
  {
    id: getTokenId(ChainId.Ethereum, '0x6c3ea9036406852006290770bedfcaba0e23a0e8'),
    chainId: ChainId.Ethereum,
    tokenType: 'contract',
    address: '0x6c3ea9036406852006290770bedfcaba0e23a0e8',
    symbol: 'PYUSD',
    name: 'PayPal USD',
    decimals: 6,
    supportsSwap: true,
  },
  {
    id: getTokenId(ChainId.ArbitrumOne, '0x46850ad61c2b7d64d08c9c754f45254596696984'),
    chainId: ChainId.ArbitrumOne,
    tokenType: 'contract',
    address: '0x46850ad61c2b7d64d08c9c754f45254596696984',
    symbol: 'PYUSD',
    name: 'PayPal USD',
    decimals: 6,
    supportsSwap: true,
  },
  {
    id: getTokenId(ChainId.ArbitrumOne, '0x327006c8712fe0abdbbd55b7999db39b0967342e'),
    chainId: ChainId.ArbitrumOne,
    tokenType: 'contract',
    address: '0x327006c8712fe0abdbbd55b7999db39b0967342e',
    symbol: 'PYUSD',
    name: 'PayPal USD',
    decimals: 6,
    supportsSwap: false,
  },
  {
    id: getTokenId(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne['USDC.e']),
    chainId: ChainId.ArbitrumOne,
    tokenType: 'contract',
    address: CommonAddress.ArbitrumOne['USDC.e'],
    symbol: 'USDC.e',
    name: 'Bridged USDC',
    decimals: 6,
    logoURI:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png',
    supportsSwap: false,
  },
  {
    id: getTokenId(ChainId.ApeChain, CommonAddress.ApeChain.WETH),
    chainId: ChainId.ApeChain,
    tokenType: 'contract',
    address: CommonAddress.ApeChain.WETH,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoURI: '/images/EthereumLogoRound.svg',
    supportsSwap: true,
  },
];
const manualTokenById = new Map(manualContractTokens.map((token) => [token.id, token]));

// Canonical and CCTP edges (explicit, protocol-specific routes)
const protocolEdges: MappingEdge[] = [
  // ETH <-> Arb1: native ETH
  createEdge({
    fromTokenId: getTokenId(ChainId.Ethereum),
    toTokenId: getTokenId(ChainId.ArbitrumOne),
    provider: 'canonical',
  }),
  createEdge({
    fromTokenId: getTokenId(ChainId.ArbitrumOne),
    toTokenId: getTokenId(ChainId.Ethereum),
    provider: 'canonical',
  }),
  // ETH <-> Arb1: WETH
  createEdge({
    fromTokenId: getTokenId(ChainId.Ethereum, CommonAddress.Ethereum.WETH),
    toTokenId: getTokenId(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne.WETH),
    provider: 'canonical',
  }),
  createEdge({
    fromTokenId: getTokenId(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne.WETH),
    toTokenId: getTokenId(ChainId.Ethereum, CommonAddress.Ethereum.WETH),
    provider: 'canonical',
  }),
  // ETH <-> Arb1: USDC (canonical -> USDC.e)
  createEdge({
    fromTokenId: getTokenId(ChainId.Ethereum, CommonAddress.Ethereum.USDC),
    toTokenId: getTokenId(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne['USDC.e']),
    provider: 'canonical',
  }),
  createEdge({
    fromTokenId: getTokenId(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne['USDC.e']),
    toTokenId: getTokenId(ChainId.Ethereum, CommonAddress.Ethereum.USDC),
    provider: 'canonical',
  }),
  // ETH <-> Arb1: USDC (cctp -> native USDC)
  createEdge({
    fromTokenId: getTokenId(ChainId.Ethereum, CommonAddress.Ethereum.USDC),
    toTokenId: getTokenId(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne.USDC),
    provider: 'cctp',
  }),
  createEdge({
    fromTokenId: getTokenId(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne.USDC),
    toTokenId: getTokenId(ChainId.Ethereum, CommonAddress.Ethereum.USDC),
    provider: 'cctp',
  }),
  // ETH <-> Arb1: APE
  createEdge({
    fromTokenId: getTokenId(ChainId.Ethereum, CommonAddress.Ethereum.APE),
    toTokenId: getTokenId(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne.APE),
    provider: 'canonical',
  }),
  createEdge({
    fromTokenId: getTokenId(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne.APE),
    toTokenId: getTokenId(ChainId.Ethereum, CommonAddress.Ethereum.APE),
    provider: 'canonical',
  }),
  // Arb1 -> ETH: withdraw-only PYUSD representation
  createEdge({
    fromTokenId: getTokenId(ChainId.ArbitrumOne, '0x327006c8712fe0abdbbd55b7999db39b0967342e'),
    toTokenId: getTokenId(ChainId.Ethereum, '0x6c3ea9036406852006290770bedfcaba0e23a0e8'),
    provider: 'canonical',
  }),
  // Arb1 <-> ApeChain: native ETH -> WETH (canonical)
  createEdge({
    fromTokenId: getTokenId(ChainId.ArbitrumOne),
    toTokenId: getTokenId(ChainId.ApeChain, CommonAddress.ApeChain.WETH),
    provider: 'canonical',
  }),
  createEdge({
    fromTokenId: getTokenId(ChainId.ApeChain, CommonAddress.ApeChain.WETH),
    toTokenId: getTokenId(ChainId.ArbitrumOne),
    provider: 'canonical',
  }),
  // Arb1 <-> ApeChain: APE (canonical)
  createEdge({
    fromTokenId: getTokenId(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne.APE),
    toTokenId: getTokenId(ChainId.ApeChain),
    provider: 'canonical',
  }),
  createEdge({
    fromTokenId: getTokenId(ChainId.ApeChain),
    toTokenId: getTokenId(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne.APE),
    provider: 'canonical',
  }),
];

function createEdge({ fromTokenId, toTokenId, provider }: Omit<MappingEdge, 'id'>): MappingEdge {
  return {
    id: `${fromTokenId}->${toTokenId}:${provider}`,
    fromTokenId,
    toTokenId,
    provider,
  };
}

function getChainIdFromTokenId(tokenId: string) {
  const [chainId] = tokenId.split(':');
  return Number(chainId);
}

function getBestPriority(providers: readonly MappingProvider[]) {
  return Math.min(...providers.map((provider) => providerOrder[provider]));
}

function getReachableSourceTokenIds({
  tokens,
  edges,
  sourceChainId,
  destinationChainId,
}: {
  tokens: TokenVariant[];
  edges: MappingEdge[];
  sourceChainId: number;
  destinationChainId: number;
}) {
  const tokenIds = new Set<string>();
  const lifiDestinationChains = new Set(lifiDestinationChainIds[sourceChainId] ?? []);

  for (const edge of edges) {
    if (getChainIdFromTokenId(edge.fromTokenId) !== sourceChainId) {
      continue;
    }

    if (getChainIdFromTokenId(edge.toTokenId) !== destinationChainId) {
      continue;
    }

    tokenIds.add(edge.fromTokenId);
  }

  if (lifiDestinationChains.has(destinationChainId)) {
    for (const token of tokens) {
      if (token.chainId === sourceChainId && token.supportsSwap) {
        tokenIds.add(token.id);
      }
    }
  }

  return tokenIds;
}

function getSourceProvidersForDestination(params: {
  token: TokenVariant;
  edges: MappingEdge[];
  destinationChainId: number;
}): readonly MappingProvider[] {
  const { token, edges, destinationChainId } = params;
  const providers = edges
    .filter(
      (edge) =>
        edge.fromTokenId === token.id &&
        getChainIdFromTokenId(edge.toTokenId) === destinationChainId,
    )
    .map((edge) => edge.provider);

  if (providers.length > 0) {
    return providers;
  }

  const lifiDestinationChains = new Set(lifiDestinationChainIds[token.chainId] ?? []);
  if (token.supportsSwap && lifiDestinationChains.has(destinationChainId)) {
    return ['lifi'];
  }

  return [];
}

function getTokenIdForLifiToken(params: { chainId: number; address: string; coinKey: CoinKey }) {
  const { chainId, address, coinKey } = params;

  if (!supportedChainIds.has(chainId)) {
    return null;
  }

  if (coinKey === CoinKey.ETH && chainId !== ChainId.ApeChain) {
    return getTokenId(chainId);
  }

  if (coinKey === CoinKey.APE && chainId === ChainId.ApeChain) {
    return getTokenId(chainId);
  }

  if (address.toLowerCase() === ADDRESS_ZERO && chainId !== ChainId.ApeChain) {
    return getTokenId(chainId);
  }

  return getTokenId(chainId, address);
}

async function getLifiGraphData() {
  const registry = await getLifiTokenRegistry();

  const tokens = Object.entries(registry.tokensByChain).flatMap(([chainId, chainTokens]) =>
    chainTokens.flatMap((token) => {
      const resolvedTokenId = getTokenIdForLifiToken({
        chainId: Number(chainId),
        address: token.address,
        coinKey: token.coinKey,
      });

      if (!resolvedTokenId) {
        return [];
      }

      const isNative = resolvedTokenId.endsWith(':native');

      return [
        {
          id: resolvedTokenId,
          chainId: Number(chainId),
          tokenType: isNative ? ('native' as const) : ('contract' as const),
          address: isNative ? undefined : token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          logoURI: token.logoURI,
          supportsSwap: true,
        },
      ];
    }),
  );

  return {
    registry,
    tokens,
  };
}

// --- Token list fetching & caching ---

interface UniswapToken {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

let cachedTokens: TokenVariant[] | null = null;
let cachedEdges: MappingEdge[] | null = null;
let graphPromise: Promise<{
  tokens: TokenVariant[];
  edges: MappingEdge[];
}> | null = null;

function hasTokenCoverageForEdges(params: { tokens: TokenVariant[]; edges: MappingEdge[] }) {
  const { tokens, edges } = params;
  const tokenIds = new Set(tokens.map((token) => token.id));

  return edges.every((edge) => tokenIds.has(edge.fromTokenId) && tokenIds.has(edge.toTokenId));
}

async function fetchUniswapTokens(): Promise<TokenVariant[]> {
  const res = await fetch(UNISWAP_TOKEN_LIST_URL);
  const data = (await res.json()) as { tokens: UniswapToken[] };

  return data.tokens
    .filter((t) => supportedChainIds.has(t.chainId))
    .map((t) => ({
      id: getTokenId(t.chainId, t.address),
      chainId: t.chainId,
      tokenType: 'contract' as const,
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      logoURI: t.logoURI,
      supportsSwap: true,
    }));
}

function buildLifiEdges(params: {
  tokens: TokenVariant[];
  registry: Awaited<ReturnType<typeof getLifiTokenRegistry>>;
}): MappingEdge[] {
  const { tokens, registry } = params;
  const tokenIds = new Set(tokens.map((token) => token.id));
  const edgesById = new Map<string, MappingEdge>();

  for (const [sourceChainIdString, destinationChainIds] of Object.entries(
    lifiDestinationChainIds,
  )) {
    const sourceChainId = Number(sourceChainIdString);
    if (!supportedChainIds.has(sourceChainId)) {
      continue;
    }

    const sourceTokens = registry.tokensByChain[sourceChainId] ?? [];

    for (const destinationChainId of destinationChainIds) {
      if (!supportedChainIds.has(destinationChainId)) {
        continue;
      }

      const destinationTokensByCoinKey = registry.tokensByChainAndCoinKey[destinationChainId] ?? {};

      for (const sourceToken of sourceTokens) {
        const destinationToken =
          destinationChainId === ChainId.ApeChain && sourceToken.coinKey === CoinKey.ETH
            ? destinationTokensByCoinKey[CoinKey.WETH]
            : destinationTokensByCoinKey[sourceToken.coinKey];

        if (!destinationToken) {
          continue;
        }

        const fromTokenId = getTokenIdForLifiToken({
          chainId: sourceChainId,
          address: sourceToken.address,
          coinKey: sourceToken.coinKey,
        });
        const toTokenId = getTokenIdForLifiToken({
          chainId: destinationChainId,
          address: destinationToken.address,
          coinKey: destinationToken.coinKey,
        });

        if (!fromTokenId || !toTokenId) {
          continue;
        }

        if (!tokenIds.has(fromTokenId) || !tokenIds.has(toTokenId)) {
          continue;
        }

        const edge = createEdge({ fromTokenId, toTokenId, provider: 'lifi' });
        edgesById.set(edge.id, edge);
      }
    }
  }

  return [...edgesById.values()];
}

async function getGraphData() {
  if (cachedTokens && cachedEdges) {
    if (
      !hasTokenCoverageForEdges({
        tokens: cachedTokens,
        edges: cachedEdges,
      })
    ) {
      cachedTokens = null;
      cachedEdges = null;
      graphPromise = null;
    } else {
      return { tokens: cachedTokens, edges: cachedEdges };
    }
  }

  if (graphPromise && cachedTokens && cachedEdges) {
    return { tokens: cachedTokens, edges: cachedEdges };
  }

  if (!graphPromise) {
    graphPromise = Promise.all([fetchUniswapTokens(), getLifiGraphData()]).then(
      ([uniswapTokens, lifiGraphData]) => {
        const tokenById = new Map<string, TokenVariant>();

        [
          ...nativeTokens,
          ...manualContractTokens,
          ...lifiGraphData.tokens,
          ...uniswapTokens,
        ].forEach((token) => {
          if (!tokenById.has(token.id)) {
            tokenById.set(token.id, token);
          }
        });

        const tokens = [...tokenById.values()];
        const edges = [
          ...protocolEdges,
          ...buildLifiEdges({ tokens, registry: lifiGraphData.registry }),
        ];

        cachedTokens = tokens;
        cachedEdges = edges;
        return { tokens, edges };
      },
    );
  }

  return graphPromise;
}

async function getTokens(): Promise<TokenVariant[]> {
  const graphData = await getGraphData();
  return graphData.tokens;
}

// --- Helpers ---

function matchesQuery(token: TokenVariant, q: string) {
  const query = q.trim().toLowerCase();
  if (!query) {
    return true;
  }

  return [token.symbol, token.name, token.id, token.address ?? ''].some((value) =>
    value.toLowerCase().includes(query),
  );
}

function sortTokens(left: TokenVariant, right: TokenVariant) {
  return left.symbol.localeCompare(right.symbol) || left.name.localeCompare(right.name);
}

// --- Public API ---

export function getChainById(chainId: number) {
  return chains.find((chain) => chain.chainId === chainId) ?? null;
}

export async function getTokenById(tokenId: string): Promise<TokenVariant | null> {
  const tokens = await getTokens();
  return tokens.find((t) => t.id === tokenId) ?? null;
}

export async function searchTokens({
  chainId,
  q = '',
  tokenId,
  destinationChainId,
}: {
  chainId: number;
  q?: string;
  tokenId?: string;
  destinationChainId?: number;
}): Promise<TokensResponse> {
  const { tokens, edges } = await getGraphData();
  const chainTokens = tokens.filter((token) => token.chainId === chainId);

  if (tokenId) {
    return {
      items: chainTokens.filter((token) => token.id === tokenId),
    };
  }

  const reachableSourceTokenIds =
    destinationChainId !== undefined
      ? getReachableSourceTokenIds({
          tokens,
          edges,
          sourceChainId: chainId,
          destinationChainId,
        })
      : null;

  return {
    items: chainTokens
      .filter((token) => (reachableSourceTokenIds ? reachableSourceTokenIds.has(token.id) : true))
      .filter((token) => matchesQuery(token, q))
      .sort((left, right) => {
        if (!destinationChainId) {
          return sortTokens(left, right);
        }

        const leftProviders = getSourceProvidersForDestination({
          token: left,
          edges,
          destinationChainId,
        });
        const rightProviders = getSourceProvidersForDestination({
          token: right,
          edges,
          destinationChainId,
        });

        return (
          getBestPriority(leftProviders) - getBestPriority(rightProviders) ||
          sortTokens(left, right)
        );
      }),
  };
}

export async function getBalances({
  chainId,
  walletAddress,
  destinationChainId,
}: {
  chainId: number;
  walletAddress: string;
  destinationChainId?: number;
}): Promise<BalancesResponse> {
  if (!isAddress(walletAddress)) {
    throw new Error('Invalid wallet address');
  }

  const rpcUrl = rpcURLs[chainId];
  if (!rpcUrl) {
    throw new Error(`No RPC URL configured for chain ${chainId}`);
  }

  const { tokens, edges } = await getGraphData();
  const client = createPublicClient({
    transport: http(rpcUrl),
    batch: { multicall: true },
  });
  const reachableSourceTokenIds =
    destinationChainId !== undefined
      ? getReachableSourceTokenIds({
          tokens,
          edges,
          sourceChainId: chainId,
          destinationChainId,
        })
      : null;
  const chainTokens = tokens
    .filter((token) => token.chainId === chainId)
    .filter((token) => (reachableSourceTokenIds ? reachableSourceTokenIds.has(token.id) : true));
  const nativeToken = chainTokens.find((token) => token.tokenType === 'native') ?? null;
  const contractTokens = chainTokens.filter(
    (token): token is TokenVariant & { address: string } =>
      token.tokenType === 'contract' && typeof token.address === 'string',
  );
  const [nativeBalance, tokenBalances] = await Promise.all([
    nativeToken ? client.getBalance({ address: walletAddress }) : null,
    client.multicall({
      multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
      contracts: contractTokens.map((token) => ({
        address: token.address as Address,
        abi: erc20Abi,
        functionName: 'balanceOf' as const,
        args: [walletAddress],
      })),
    }),
  ]);
  const items: BalancesResponse['items'] = [];

  if (nativeToken && nativeBalance && nativeBalance > BigInt(0)) {
    items.push({
      token: nativeToken,
      balance: formatUnits(nativeBalance, nativeToken.decimals),
    });
  }

  tokenBalances.forEach((result, index) => {
    if (result.status !== 'success' || !result.result) {
      return;
    }

    const token = contractTokens[index];
    if (!token) {
      return;
    }

    items.push({
      token,
      balance: formatUnits(result.result, token.decimals),
    });
  });

  return {
    chainId,
    walletAddress,
    items,
  };
}

export async function getDestinationTokens({
  sourceTokenId,
  destinationChainId,
  q = '',
  includeSwapFallback = false,
}: {
  sourceTokenId: string;
  destinationChainId: number;
  q?: string;
  includeSwapFallback?: boolean;
}): Promise<DestinationTokensResponse> {
  const { edges, tokens } = await getGraphData();
  const tokenById = new Map(tokens.map((token) => [token.id, token]));
  const sourceToken = tokenById.get(sourceTokenId) ?? manualTokenById.get(sourceTokenId);
  const sourceChainId = getChainIdFromTokenId(sourceTokenId);
  const items: Array<DestinationTokensResponse['items'][number] & { rankGroup: number }> = [];
  const lifiRouteTokenIds = new Set<string>();

  for (const edge of edges) {
    if (edge.fromTokenId !== sourceTokenId) {
      continue;
    }

    if (getChainIdFromTokenId(edge.toTokenId) !== destinationChainId) {
      continue;
    }

    const token = tokenById.get(edge.toTokenId) ?? manualTokenById.get(edge.toTokenId);
    if (!token || !matchesQuery(token, q)) {
      continue;
    }

    items.push({
      routeId: edge.id,
      token,
      provider: edge.provider,
      bestPriority: providerOrder[edge.provider],
      rankGroup: 0,
    });

    if (edge.provider === 'lifi') {
      lifiRouteTokenIds.add(token.id);
    }
  }

  const lifiDestinationChains = new Set(lifiDestinationChainIds[sourceChainId] ?? []);
  const canUseLifiSwapFallback =
    sourceToken?.supportsSwap && lifiDestinationChains.has(destinationChainId);

  if (includeSwapFallback && canUseLifiSwapFallback) {
    for (const token of tokens) {
      if (
        token.chainId !== destinationChainId ||
        token.tokenType !== 'contract' ||
        !token.supportsSwap ||
        !matchesQuery(token, q)
      ) {
        continue;
      }

      if (lifiRouteTokenIds.has(token.id)) {
        continue;
      }

      items.push({
        routeId: `${sourceTokenId}->${token.id}:lifi-swap`,
        token,
        provider: 'lifi',
        bestPriority: providerOrder.lifi,
        rankGroup: 1,
      });
    }
  }

  return {
    sourceTokenId,
    items: items
      .sort((left, right) => {
        return (
          left.rankGroup - right.rankGroup ||
          left.bestPriority - right.bestPriority ||
          left.token.symbol.localeCompare(right.token.symbol) ||
          left.token.name.localeCompare(right.token.name) ||
          left.routeId.localeCompare(right.routeId)
        );
      })
      .map(({ rankGroup: _, ...item }) => item),
  };
}
