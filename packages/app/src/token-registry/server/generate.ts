import { unstable_cache } from 'next/cache';

import {
  ChainIds,
  canonicalRouteExclusions,
  cctpConfig,
  getCuratedCoinKey,
  hardcodedTokens,
  isExcludedToken,
  isSupportedPair,
  layerZeroConfig,
  supportedPairs,
} from '../constants';
import { normalizeToken } from '../normalize';
import {
  Address,
  ChainPair,
  ChainTokens,
  NATIVE_TOKEN_ADDRESS,
  ProviderRoutes,
  RouteMapArtifact,
  Token,
  TokenPayload,
  pairKey,
} from '../types';

// in priority order — the first list defining a token wins
const ARBED_TOKEN_LIST_URLS = [
  'https://tokenlist.arbitrum.io/ArbTokenLists/arbitrum_token_token_list.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs_default.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coingecko.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coinmarketcap.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json',
];

// bump to invalidate all unstable_cache entries when generation logic changes
const CACHE_VERSION = 5;

const LIFI_CONNECTIONS_URL = 'https://li.quest/v1/connections';
const LIFI_TOKENS_URL = 'https://li.quest/v1/tokens';

// ---------------------------------------------------------------------------
// canonical (generated from the arbified token lists)
// ---------------------------------------------------------------------------

type TokenListEntry = {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  extensions?: {
    bridgeInfo?: Record<string, { tokenAddress: string }>;
  };
};

async function fetchArbedTokenList(url: string): Promise<TokenListEntry[]> {
  const response = await fetch(url, {
    next: { revalidate: 86_400 },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch arbed token list ${url}: ${response.status}`);
  }
  const list = (await response.json()) as { tokens: TokenListEntry[] };
  return list.tokens;
}

/** all lists concatenated in priority order; a failing list is skipped */
async function fetchArbedTokenLists(): Promise<TokenListEntry[]> {
  const lists = await Promise.all(
    ARBED_TOKEN_LIST_URLS.map(async (url) => {
      try {
        return await fetchArbedTokenList(url);
      } catch (error) {
        console.warn(`[token-registry] skipping token list: ${error}`);
        return [];
      }
    }),
  );
  return lists.flat();
}

export type CanonicalEntry = { parent: Token; child: Token };

function getCanonicalEntries(listTokens: TokenListEntry[]): CanonicalEntry[] {
  const entries: CanonicalEntry[] = [];
  const seenChildAddresses = new Set<string>();

  for (const entry of listTokens) {
    if (entry.chainId !== ChainIds.ArbitrumOne) {
      continue;
    }
    const parentAddress = entry.extensions?.bridgeInfo?.[String(ChainIds.Ethereum)]?.tokenAddress;
    if (!parentAddress) {
      continue;
    }
    const childAddress = entry.address.toLowerCase();
    if (seenChildAddresses.has(childAddress)) {
      continue;
    }
    seenChildAddresses.add(childAddress);
    if (
      isExcludedToken(ChainIds.Ethereum, parentAddress) ||
      isExcludedToken(ChainIds.ArbitrumOne, childAddress)
    ) {
      continue;
    }

    const metadata = {
      symbol: entry.symbol,
      name: entry.name,
      decimals: entry.decimals,
      logoURI: entry.logoURI,
    };
    entries.push({
      parent: normalizeToken({
        chainId: ChainIds.Ethereum,
        address: parentAddress,
        ...metadata,
      }),
      child: normalizeToken({
        chainId: ChainIds.ArbitrumOne,
        address: entry.address,
        ...metadata,
      }),
    });
  }

  return entries;
}

export function generateCanonical(
  entries: CanonicalEntry[],
  pair: ChainPair,
): Extract<ProviderRoutes, { provider: 'canonical' }> {
  const excluded = new Set(canonicalRouteExclusions[pairKey(pair)] ?? []);
  const routes: Record<Address, Address> = {
    // native ETH bridges canonically in both directions
    [NATIVE_TOKEN_ADDRESS]: NATIVE_TOKEN_ADDRESS,
  };

  for (const { parent, child } of entries) {
    const [source, destination]: [Token, Token] =
      pair.sourceChainId === ChainIds.Ethereum ? [parent, child] : [child, parent];
    if (excluded.has(source.address)) {
      continue;
    }
    routes[source.address] = destination.address;
  }

  return { provider: 'canonical', routes };
}

// ---------------------------------------------------------------------------
// lifi (generated from the connections + tokens APIs; coinKey stays
// server-side)
// ---------------------------------------------------------------------------

// the connections API only returns membership (address + chainId);
// metadata and coinKey come from the tokens API
type LifiConnectionToken = {
  address: string;
  chainId: number;
};

type LifiConnection = {
  fromChainId: number;
  toChainId: number;
  fromTokens: LifiConnectionToken[];
  toTokens: LifiConnectionToken[];
};

type LifiTokenMetadata = {
  address: string;
  chainId: number;
  symbol: string;
  decimals: number;
  name: string;
  coinKey?: string;
  logoURI?: string;
};

function lifiHeaders(): Headers {
  const headers = new Headers();
  const apiKey = process.env.LIFI_KEY;
  if (apiKey) {
    headers.set('x-lifi-api-key', apiKey);
  }
  return headers;
}

async function fetchLifiConnection(pair: ChainPair): Promise<LifiConnection | null> {
  const url = new URL(LIFI_CONNECTIONS_URL);
  url.searchParams.set('fromChain', String(pair.sourceChainId));
  url.searchParams.set('toChain', String(pair.destinationChainId));

  const response = await fetch(url.toString(), {
    headers: lifiHeaders(),
    next: { revalidate: 3_600 },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch LiFi connections: ${response.status}`);
  }

  const data = (await response.json()) as { connections: LifiConnection[] };
  return (
    data.connections.find(
      (connection) =>
        connection.fromChainId === pair.sourceChainId &&
        connection.toChainId === pair.destinationChainId,
    ) ?? null
  );
}

// one request per chain: each response fits Next's 2MB fetch-cache limit
// (the combined one does not) and is reused across every pair touching the
// chain
async function fetchLifiChainTokens(chainId: number): Promise<LifiTokenMetadata[]> {
  const url = new URL(LIFI_TOKENS_URL);
  url.searchParams.set('chains', String(chainId));

  const response = await fetch(url.toString(), {
    headers: lifiHeaders(),
    next: { revalidate: 3_600 },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch LiFi tokens for chain ${chainId}: ${response.status}`);
  }

  const data = (await response.json()) as {
    tokens: Record<string, LifiTokenMetadata[]>;
  };
  return data.tokens[String(chainId)] ?? [];
}

/** metadata + coinKey for LiFi tokens on the given chains, keyed by `${chainId}:${address}` */
async function fetchLifiTokenMetadata(chainIds: number[]): Promise<Map<string, LifiTokenMetadata>> {
  const perChain = await Promise.all(chainIds.map(fetchLifiChainTokens));

  const byTokenId = new Map<string, LifiTokenMetadata>();
  for (const chainTokens of perChain) {
    for (const metadata of chainTokens) {
      byTokenId.set(`${metadata.chainId}:${metadata.address.toLowerCase()}`, metadata);
    }
  }
  return byTokenId;
}

async function generateLifi(pair: ChainPair): Promise<{
  providerRoutes: ProviderRoutes | null;
  swapDestinations: Address[];
  tokens: Token[];
}> {
  const [connection, metadataByTokenId] = await Promise.all([
    fetchLifiConnection(pair),
    fetchLifiTokenMetadata([pair.sourceChainId, pair.destinationChainId]),
  ]);
  if (!connection) {
    return { providerRoutes: null, swapDestinations: [], tokens: [] };
  }

  const toLifiToken = (raw: LifiConnectionToken): { token: Token; coinKey?: string } | null => {
    if (isExcludedToken(raw.chainId, raw.address)) {
      return null;
    }
    const metadata = metadataByTokenId.get(`${raw.chainId}:${raw.address.toLowerCase()}`);
    if (!metadata) {
      // without metadata the token cannot be displayed — leave it out
      return null;
    }
    return {
      token: normalizeToken({
        chainId: raw.chainId,
        address: raw.address,
        symbol: metadata.symbol,
        name: metadata.name,
        decimals: metadata.decimals,
        logoURI: metadata.logoURI,
      }),
      // curated assignments cover tokens LiFi gives no coinKey (PYUSD, ENA)
      coinKey: getCuratedCoinKey(raw.chainId, raw.address) ?? metadata.coinKey,
    };
  };

  const tokens: Token[] = [];
  const counterpartByCoinKey = new Map<string, Address>();
  const swapDestinations: Address[] = [];

  for (const raw of connection.toTokens) {
    const resolved = toLifiToken(raw);
    if (!resolved) {
      continue;
    }
    tokens.push(resolved.token);
    swapDestinations.push(resolved.token.address);
    if (resolved.coinKey && !counterpartByCoinKey.has(resolved.coinKey)) {
      counterpartByCoinKey.set(resolved.coinKey, resolved.token.address);
    }
  }

  const routes: Record<Address, Address | null> = {};
  for (const raw of connection.fromTokens) {
    const resolved = toLifiToken(raw);
    if (!resolved) {
      continue;
    }
    tokens.push(resolved.token);
    routes[resolved.token.address] = resolved.coinKey
      ? (counterpartByCoinKey.get(resolved.coinKey) ?? null)
      : null;
  }

  return { providerRoutes: { provider: 'lifi', routes }, swapDestinations, tokens };
}

// ---------------------------------------------------------------------------
// registry assembly
// ---------------------------------------------------------------------------

async function buildChainTokens(chainId: number): Promise<TokenPayload[]> {
  const listTokens = await fetchArbedTokenLists();
  const lifiResults = await Promise.all(supportedPairs.map((pair) => generateLifi(pair)));

  const tokens: ChainTokens = {};
  const add = (token: Token) => {
    if (isExcludedToken(token.chainId, token.address)) {
      return;
    }
    if (token.chainId === chainId && !tokens[token.id]) {
      tokens[token.id] = token;
    }
  };

  for (const token of hardcodedTokens) {
    add(token);
  }
  for (const { parent, child } of getCanonicalEntries(listTokens)) {
    add(parent);
    add(child);
  }
  for (const result of lifiResults) {
    for (const token of result.tokens) {
      add(token);
    }
  }

  // wire format: id and chainId are derivable from the endpoint — stripped
  // here, re-derived during client hydration
  return Object.values(tokens).map(({ id: _id, chainId: _chainId, ...payload }) => payload);
}

async function buildRouteMap(pair: ChainPair): Promise<RouteMapArtifact> {
  const providers: ProviderRoutes[] = [];

  const listTokens = await fetchArbedTokenLists();
  providers.push(generateCanonical(getCanonicalEntries(listTokens), pair));

  const cctp = cctpConfig[pairKey(pair)];
  if (cctp) {
    providers.push({ provider: 'cctp', routes: cctp });
  }

  const layerzero = layerZeroConfig[pairKey(pair)];
  if (layerzero) {
    providers.push({ provider: 'layerzero', routes: layerzero });
  }

  const { providerRoutes } = await generateLifi(pair);
  if (providerRoutes) {
    providers.push(providerRoutes);
  }

  return {
    sourceChainId: pair.sourceChainId,
    destinationChainId: pair.destinationChainId,
    providers,
  };
}

export function getChainTokens(chainId: number): Promise<TokenPayload[]> {
  return unstable_cache(
    () => buildChainTokens(chainId),
    [`token-registry-tokens-${chainId}-v${CACHE_VERSION}`],
    {
      revalidate: 3_600,
      tags: [`token-registry-tokens-${chainId}-v${CACHE_VERSION}`],
    },
  )();
}

export function getSwapDestinations(pair: ChainPair): Promise<Address[] | null> {
  if (!isSupportedPair(pair)) {
    return Promise.resolve(null);
  }
  return unstable_cache(
    async () => (await generateLifi(pair)).swapDestinations,
    [`token-registry-swap-destinations-${pairKey(pair)}-v${CACHE_VERSION}`],
    {
      revalidate: 3_600,
      tags: [`token-registry-swap-destinations-${pairKey(pair)}-v${CACHE_VERSION}`],
    },
  )();
}

export function getRouteMap(pair: ChainPair): Promise<RouteMapArtifact | null> {
  if (!isSupportedPair(pair)) {
    return Promise.resolve(null);
  }
  return unstable_cache(
    () => buildRouteMap(pair),
    [`token-registry-routes-${pairKey(pair)}-v${CACHE_VERSION}`],
    {
      revalidate: 3_600,
      tags: [`token-registry-routes-${pairKey(pair)}-v${CACHE_VERSION}`],
    },
  )();
}
