import { unstable_cache } from 'next/cache';

import {
  ChainIds,
  blockedLifiSourceRoutes,
  blockedSourceRoutes,
  getCuratedCoinKey,
  getDefaultDestinationOverride,
  hardcodedCanonicalRoutes,
  hardcodedLifiRoutes,
  hardcodedTokens,
  isExcludedToken,
  isSupportedPair,
  layerZeroConfig,
} from '../constants';
import { normalizeToken } from '../normalize';
import {
  Address,
  ChainPair,
  NATIVE_TOKEN_ADDRESS,
  ProviderId,
  RouteOption,
  SelectedTokenAvailability,
  Token,
  TokenId,
  pairKey,
  toTokenId,
} from '../types';
import { resolveImport } from './resolveImport';

type ProviderRoutes =
  | { provider: 'canonical'; routes: Record<Address, Address> }
  | { provider: 'layerzero'; routes: (typeof layerZeroConfig)[string] }
  | { provider: 'lifi'; routes: Record<Address, Address | null> };

const ARBED_TOKEN_LIST_URLS = [
  'https://tokenlist.arbitrum.io/ArbTokenLists/arbitrum_token_token_list.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs_default.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coingecko.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coinmarketcap.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json',
];

const PAIR_REGISTRY_CACHE_VERSION = 1;

const LIFI_CONNECTIONS_URL = 'https://li.quest/v1/connections';
const LIFI_TOKENS_URL = 'https://li.quest/v1/tokens';

function isEthereumArbitrumOnePair(pair: ChainPair): boolean {
  return (
    (pair.sourceChainId === ChainIds.Ethereum &&
      pair.destinationChainId === ChainIds.ArbitrumOne) ||
    (pair.sourceChainId === ChainIds.ArbitrumOne && pair.destinationChainId === ChainIds.Ethereum)
  );
}

function removeSourceRoutes<T>(
  routes: Record<Address, T>,
  blocked?: Address[],
): Record<Address, T> {
  if (!blocked) {
    return routes;
  }

  const filtered = { ...routes };
  for (const sourceAddress of blocked) {
    delete filtered[sourceAddress];
  }
  return filtered;
}

function removeBlockedSourceRoutes<T>(
  pair: ChainPair,
  routes: Record<Address, T>,
): Record<Address, T> {
  return removeSourceRoutes(routes, blockedSourceRoutes[pairKey(pair)]);
}

function removeBlockedLifiSourceRoutes<T>(
  pair: ChainPair,
  routes: Record<Address, T>,
): Record<Address, T> {
  return removeSourceRoutes(
    removeBlockedSourceRoutes(pair, routes),
    blockedLifiSourceRoutes[pairKey(pair)],
  );
}

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
): { provider: 'canonical'; routes: Record<Address, Address> } {
  const routes: Record<Address, Address> = {
    [NATIVE_TOKEN_ADDRESS]: NATIVE_TOKEN_ADDRESS,
  };

  for (const { parent, child } of entries) {
    const [source, destination]: [Token, Token] =
      pair.sourceChainId === ChainIds.Ethereum ? [parent, child] : [child, parent];
    routes[source.address] = destination.address;
  }

  return { provider: 'canonical', routes };
}

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

// A combined LiFi token response exceeds Next's 2 MiB fetch-cache limit.
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
  tokens: Token[];
  destinationTokenIds: Set<TokenId>;
}> {
  const [connection, metadataByTokenId] = await Promise.all([
    fetchLifiConnection(pair),
    fetchLifiTokenMetadata([pair.sourceChainId, pair.destinationChainId]),
  ]);
  if (!connection) {
    return { providerRoutes: null, tokens: [], destinationTokenIds: new Set() };
  }

  const toLifiToken = (raw: LifiConnectionToken): { token: Token; coinKey?: string } | null => {
    if (isExcludedToken(raw.chainId, raw.address)) {
      return null;
    }
    const metadata = metadataByTokenId.get(`${raw.chainId}:${raw.address.toLowerCase()}`);
    if (!metadata) {
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
      coinKey: getCuratedCoinKey(raw.chainId, raw.address) ?? metadata.coinKey,
    };
  };

  const tokens: Token[] = [];
  const destinationTokenIds = new Set<TokenId>();
  const counterpartByCoinKey = new Map<string, Address>();

  for (const raw of connection.toTokens) {
    const resolved = toLifiToken(raw);
    if (!resolved) {
      continue;
    }
    tokens.push(resolved.token);
    destinationTokenIds.add(resolved.token.id);
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

  return { providerRoutes: { provider: 'lifi', routes }, tokens, destinationTokenIds };
}

type CachedToken = Omit<Token, 'id'> & {
  isLifiDestination?: true;
};

type CachedPairRegistry = {
  providers: ProviderRoutes[];
  tokens: CachedToken[];
};

async function buildPairRegistry(pair: ChainPair): Promise<CachedPairRegistry> {
  const providers: ProviderRoutes[] = [];
  const tokens: Token[] = hardcodedTokens.filter(
    (token) => token.chainId === pair.sourceChainId || token.chainId === pair.destinationChainId,
  );

  const shouldGenerateCanonical = isEthereumArbitrumOnePair(pair);
  const [listTokens, lifiResult] = await Promise.all([
    shouldGenerateCanonical ? fetchArbedTokenLists() : Promise.resolve([]),
    generateLifi(pair),
  ]);

  if (shouldGenerateCanonical) {
    const canonicalEntries = getCanonicalEntries(listTokens);
    const canonicalRoutes = removeBlockedSourceRoutes(
      pair,
      generateCanonical(canonicalEntries, pair).routes,
    );
    if (Object.keys(canonicalRoutes).length > 0) {
      providers.push({ provider: 'canonical', routes: canonicalRoutes });
    }
    for (const { parent, child } of canonicalEntries) {
      tokens.push(parent, child);
    }
  }

  const hardcodedCanonical = hardcodedCanonicalRoutes[pairKey(pair)];
  if (hardcodedCanonical) {
    const routes = removeBlockedSourceRoutes(pair, hardcodedCanonical);
    if (Object.keys(routes).length > 0) {
      providers.push({ provider: 'canonical', routes });
    }
  }

  const layerzero = layerZeroConfig[pairKey(pair)];
  if (layerzero) {
    const routes = removeBlockedSourceRoutes(pair, layerzero);
    if (Object.keys(routes).length > 0) {
      providers.push({ provider: 'layerzero', routes });
    }
  }

  const lifiRoutes = {
    ...(lifiResult.providerRoutes?.provider === 'lifi' ? lifiResult.providerRoutes.routes : {}),
    ...(hardcodedLifiRoutes[pairKey(pair)] ?? {}),
  };
  const filteredLifiRoutes = removeBlockedLifiSourceRoutes(pair, lifiRoutes);
  if (Object.keys(filteredLifiRoutes).length > 0) {
    providers.push({ provider: 'lifi', routes: filteredLifiRoutes });
  }
  tokens.push(...lifiResult.tokens);

  const tokensById = new Map<TokenId, CachedToken>();
  for (const token of tokens) {
    const cachedToken = tokensById.get(token.id);
    if (!cachedToken) {
      const { id: _id, ...tokenMetadata } = token;
      tokensById.set(token.id, {
        ...tokenMetadata,
        ...(lifiResult.destinationTokenIds.has(token.id) ? { isLifiDestination: true } : {}),
      });
    } else if (lifiResult.destinationTokenIds.has(token.id)) {
      cachedToken.isLifiDestination = true;
    }
  }

  return {
    providers,
    tokens: [...tokensById.values()],
  };
}

function getTokenMap(
  tokens: CachedToken[],
  chainId: number,
  predicate: (token: CachedToken) => boolean = () => true,
): Map<TokenId, Token> {
  const byId = new Map<TokenId, Token>();
  for (const token of tokens) {
    if (token.chainId !== chainId || !predicate(token)) {
      continue;
    }

    const id = toTokenId(token.chainId, token.address);
    const { isLifiDestination: _isLifiDestination, ...tokenMetadata } = token;
    byId.set(id, { id, ...tokenMetadata });
  }
  return byId;
}

function sortTokens(tokens: Token[]): Token[] {
  return [...tokens].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

function getSourceRouteAddresses(providers: ProviderRoutes[]): Address[] {
  const seen = new Set<Address>();
  for (const section of providers) {
    for (const sourceAddress of Object.keys(section.routes) as Address[]) {
      seen.add(sourceAddress);
    }
  }
  return [...seen];
}

const defaultDestinationPriority: ProviderId[] = ['canonical', 'layerzero', 'lifi'];

function hasSwapRoute(routes: RouteOption[]): boolean {
  return routes.some((route) => route.provider === 'lifi');
}

function getDefaultDestinationToken({
  destinationChainId,
  destinationTokens,
  routes,
}: {
  destinationChainId: number;
  destinationTokens: Map<TokenId, Token>;
  routes: RouteOption[];
}): Token | null {
  for (const provider of defaultDestinationPriority) {
    const route = routes.find((option) => option.provider === provider);
    if (route?.destinationToken) {
      return route.destinationToken;
    }
  }

  return hasSwapRoute(routes)
    ? (destinationTokens.get(toTokenId(destinationChainId, NATIVE_TOKEN_ADDRESS)) ?? null)
    : null;
}

function canReachDestinationToken({
  routes,
  destinationToken,
  lifiDestinationTokens,
}: {
  routes: RouteOption[];
  destinationToken: Token;
  lifiDestinationTokens: Map<TokenId, Token>;
}): boolean {
  if (routes.some((route) => route.destinationToken?.id === destinationToken.id)) {
    return true;
  }

  return (
    hasSwapRoute(routes) &&
    (destinationToken.address === NATIVE_TOKEN_ADDRESS ||
      lifiDestinationTokens.has(destinationToken.id))
  );
}

function materializeRoutes({
  providers,
  sourceToken,
  destinationTokensByAddress,
}: {
  providers: ProviderRoutes[];
  sourceToken: Token;
  destinationTokensByAddress: Partial<Record<Address, Token>>;
}): RouteOption[] {
  const sourceAddress = sourceToken.address;
  const routes: RouteOption[] = [];

  for (const section of providers) {
    switch (section.provider) {
      case 'canonical': {
        const destinationAddress = section.routes[sourceAddress];
        const destinationToken = destinationAddress
          ? destinationTokensByAddress[destinationAddress]
          : undefined;
        if (destinationToken) {
          routes.push({
            provider: 'canonical',
            sourceToken,
            destinationToken,
          });
        }
        break;
      }
      case 'layerzero': {
        const routeData = section.routes[sourceAddress];
        const destinationToken = routeData
          ? destinationTokensByAddress[routeData.destination]
          : undefined;
        if (routeData && destinationToken) {
          routes.push({
            provider: 'layerzero',
            sourceToken,
            destinationToken,
            oftAdapter: routeData.oftAdapter,
            destinationEndpointId: routeData.endpointId,
          });
        }
        break;
      }
      case 'lifi': {
        if (sourceAddress in section.routes) {
          const destinationAddress = section.routes[sourceAddress];
          const destinationToken = destinationAddress
            ? destinationTokensByAddress[destinationAddress]
            : undefined;
          if (destinationAddress && !destinationToken) {
            break;
          }
          routes.push({
            provider: 'lifi',
            sourceToken,
            destinationToken,
          });
        }
        break;
      }
    }
  }

  return routes;
}

function getDestinationTokenOptions({
  destinationTokensByAddress,
  lifiDestinationTokens,
  routes,
}: {
  destinationTokensByAddress: Partial<Record<Address, Token>>;
  lifiDestinationTokens: Map<TokenId, Token>;
  routes: RouteOption[];
}): Token[] {
  const byId = new Map<TokenId, Token>();
  for (const route of routes) {
    if (route.destinationToken) {
      byId.set(route.destinationToken.id, route.destinationToken);
    }
  }

  if (hasSwapRoute(routes)) {
    for (const token of lifiDestinationTokens.values()) {
      byId.set(token.id, token);
    }

    const nativeToken = destinationTokensByAddress[NATIVE_TOKEN_ADDRESS];
    if (nativeToken) {
      byId.set(nativeToken.id, nativeToken);
    }
  }

  return sortTokens([...byId.values()]);
}

function getDefaultDestinationTokenForSource({
  pair,
  sourceTokenAddress,
  destinationTokens,
  lifiDestinationTokens,
  routes,
}: {
  pair: ChainPair;
  sourceTokenAddress: Address;
  destinationTokens: Map<TokenId, Token>;
  lifiDestinationTokens: Map<TokenId, Token>;
  routes: RouteOption[];
}): Token | null {
  const defaultDestinationOverride = getDefaultDestinationOverride(pair, sourceTokenAddress);

  if (defaultDestinationOverride) {
    const destinationToken = destinationTokens.get(
      toTokenId(pair.destinationChainId, defaultDestinationOverride),
    );
    if (
      destinationToken &&
      canReachDestinationToken({
        routes,
        destinationToken,
        lifiDestinationTokens,
      })
    ) {
      return destinationToken;
    }
  }

  return getDefaultDestinationToken({
    destinationChainId: pair.destinationChainId,
    destinationTokens,
    routes,
  });
}

function getTokenAddressMap(tokens: Iterable<Token>): Partial<Record<Address, Token>> {
  const byAddress: Partial<Record<Address, Token>> = {};
  for (const token of tokens) {
    byAddress[token.address] = token;
  }
  return byAddress;
}

function getTransferableSourceTokens(registry: CachedPairRegistry, pair: ChainPair): Token[] {
  const { providers, tokens } = registry;
  const sourceTokens = getTokenMap(tokens, pair.sourceChainId);
  const destinationTokens = getTokenMap(tokens, pair.destinationChainId);
  const lifiDestinationTokens = getTokenMap(
    tokens,
    pair.destinationChainId,
    (token) => token.isLifiDestination === true,
  );
  const destinationTokensByAddress = getTokenAddressMap(destinationTokens.values());

  const transferableSourceTokens: Token[] = [];

  for (const sourceAddress of getSourceRouteAddresses(providers)) {
    const sourceToken = sourceTokens.get(toTokenId(pair.sourceChainId, sourceAddress));
    if (!sourceToken) {
      continue;
    }

    const routes = materializeRoutes({
      providers,
      sourceToken,
      destinationTokensByAddress,
    });
    if (routes.length === 0) {
      continue;
    }

    const defaultDestinationToken = getDefaultDestinationTokenForSource({
      pair,
      sourceTokenAddress: sourceToken.address,
      destinationTokens,
      lifiDestinationTokens,
      routes,
    });

    if (!defaultDestinationToken) {
      continue;
    }

    transferableSourceTokens.push(sourceToken);
  }

  return sortTokens(transferableSourceTokens);
}

function getCachedPairRegistry(pair: ChainPair): Promise<CachedPairRegistry> {
  const cacheKey = `token-registry-pair-${pairKey(pair)}-v${PAIR_REGISTRY_CACHE_VERSION}`;
  return unstable_cache(() => buildPairRegistry(pair), [cacheKey], {
    revalidate: 3_600,
    tags: [cacheKey],
  })();
}

function selectTokenAvailability({
  pair,
  registry,
  sourceTokenAddress,
  destinationTokenAddress,
}: {
  pair: ChainPair;
  registry: CachedPairRegistry;
  sourceTokenAddress: Address;
  destinationTokenAddress?: Address;
}): SelectedTokenAvailability | null {
  const sourceTokens = getTokenMap(registry.tokens, pair.sourceChainId);
  const destinationTokens = getTokenMap(registry.tokens, pair.destinationChainId);
  const lifiDestinationTokens = getTokenMap(
    registry.tokens,
    pair.destinationChainId,
    (token) => token.isLifiDestination === true,
  );
  const destinationTokensByAddress = getTokenAddressMap(destinationTokens.values());
  const sourceToken = sourceTokens.get(toTokenId(pair.sourceChainId, sourceTokenAddress));
  if (!sourceToken) {
    return null;
  }

  const routes = materializeRoutes({
    providers: registry.providers,
    sourceToken,
    destinationTokensByAddress,
  });
  if (routes.length === 0) {
    return null;
  }

  const defaultDestinationToken = getDefaultDestinationTokenForSource({
    pair,
    sourceTokenAddress,
    destinationTokens,
    lifiDestinationTokens,
    routes,
  });
  if (!defaultDestinationToken) {
    return null;
  }

  const requestedDestinationToken = destinationTokenAddress
    ? destinationTokensByAddress[destinationTokenAddress]
    : undefined;
  const destinationToken =
    requestedDestinationToken &&
    canReachDestinationToken({
      routes,
      destinationToken: requestedDestinationToken,
      lifiDestinationTokens,
    })
      ? requestedDestinationToken
      : defaultDestinationToken;

  return {
    sourceToken,
    destinationToken,
    availableRoutes: routes,
  };
}

function normalizeAddress(address: string): Address {
  return address.toLowerCase() as Address;
}

function getIndexedDestinationTokenOptions({
  pair,
  registry,
  sourceTokenAddress,
}: {
  pair: ChainPair;
  registry: CachedPairRegistry;
  sourceTokenAddress: Address;
}): Token[] | null {
  const sourceTokens = getTokenMap(registry.tokens, pair.sourceChainId);
  const destinationTokens = getTokenMap(registry.tokens, pair.destinationChainId);
  const lifiDestinationTokens = getTokenMap(
    registry.tokens,
    pair.destinationChainId,
    (token) => token.isLifiDestination === true,
  );
  const destinationTokensByAddress = getTokenAddressMap(destinationTokens.values());
  const sourceToken = sourceTokens.get(toTokenId(pair.sourceChainId, sourceTokenAddress));
  if (!sourceToken) {
    return null;
  }

  const routes = materializeRoutes({
    providers: registry.providers,
    sourceToken,
    destinationTokensByAddress,
  });
  if (routes.length === 0) {
    return null;
  }

  return getDestinationTokenOptions({
    destinationTokensByAddress,
    lifiDestinationTokens,
    routes,
  });
}

export function getSourceTokens(pair: ChainPair): Promise<Token[] | null> {
  if (!isSupportedPair(pair)) {
    return Promise.resolve(null);
  }
  return getCachedPairRegistry(pair).then((registry) =>
    getTransferableSourceTokens(registry, pair),
  );
}

export function getDestinationTokensForSource({
  pair,
  sourceTokenAddress,
}: {
  pair: ChainPair;
  sourceTokenAddress: string;
}): Promise<Token[] | null> {
  if (!isSupportedPair(pair)) {
    return Promise.resolve(null);
  }

  const normalizedSourceAddress = normalizeAddress(sourceTokenAddress);
  return getCachedPairRegistry(pair).then(async (registry) => {
    const tokens = getIndexedDestinationTokenOptions({
      pair,
      registry,
      sourceTokenAddress: normalizedSourceAddress,
    });
    if (tokens) {
      return tokens;
    }

    const importedSelection = await resolveImport(pair, normalizedSourceAddress);
    return importedSelection ? [importedSelection.destinationToken] : null;
  });
}

export async function getSelectedTokenAvailability({
  pair,
  sourceTokenAddress = NATIVE_TOKEN_ADDRESS,
  destinationTokenAddress,
}: {
  pair: ChainPair;
  sourceTokenAddress?: string;
  destinationTokenAddress?: string;
}): Promise<SelectedTokenAvailability | null> {
  if (!isSupportedPair(pair)) {
    return null;
  }

  const normalizedSourceAddress = normalizeAddress(sourceTokenAddress);
  const normalizedDestinationAddress = destinationTokenAddress
    ? normalizeAddress(destinationTokenAddress)
    : undefined;

  const registry = await getCachedPairRegistry(pair);
  const selection = selectTokenAvailability({
    pair,
    registry,
    sourceTokenAddress: normalizedSourceAddress,
    destinationTokenAddress: normalizedDestinationAddress,
  });

  if (selection) {
    return selection;
  }

  return resolveImport(pair, normalizedSourceAddress);
}
