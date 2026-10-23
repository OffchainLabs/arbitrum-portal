import { unstable_cache } from 'next/cache';

import {
  batchDepositExcludedSourceTokens,
  blockedLifiSourceRoutes,
  blockedSourceRoutes,
  getCuratedCoinKey,
  getDefaultDestinationOverride,
  hardcodedLifiRoutes,
  hardcodedTokens,
  isExcludedToken,
  isSupportedPair,
  layerZeroConfig,
  supportedPairs,
} from '../constants';
import { normalizeToken } from '../normalize';
import {
  Address,
  BatchDeposit,
  ChainPair,
  NATIVE_TOKEN_ADDRESS,
  ProviderId,
  RouteOption,
  SelectedTokenAvailability,
  Token,
  TokenId,
  isNativeToken,
  pairKey,
  toTokenId,
} from '../types';
import {
  CanonicalBridge,
  getCanonicalBridge,
  isCanonicalDeposit,
  isCanonicalTransferAllowed,
} from './canonicalBridge';
import { resolveImport } from './resolveImport';

type ProviderRoutes =
  | { provider: 'canonical'; routes: Record<Address, Address> }
  | { provider: 'layerzero'; routes: (typeof layerZeroConfig)[string] }
  | { provider: 'lifi'; routes: Record<Address, Address | null> };

const REGISTRY_CACHE_VERSION = 2;

// Next skips data-cache entries over 2 MiB, so stay well below that.
const CACHE_ENTRY_BUDGET = 1.5 * 1024 * 1024;

const LIFI_CONNECTIONS_URL = 'https://li.quest/v1/connections';
const LIFI_TOKENS_URL = 'https://li.quest/v1/tokens';

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

async function fetchArbedTokenLists(urls: string[]): Promise<TokenListEntry[]> {
  const lists = await Promise.all(
    urls.map(async (url) => {
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

function getCanonicalEntries(
  listTokens: TokenListEntry[],
  bridge: CanonicalBridge,
): CanonicalEntry[] {
  const entries: CanonicalEntry[] = [];
  const seenChildAddresses = new Set<string>();

  for (const entry of listTokens) {
    if (entry.chainId !== bridge.childChainId) {
      continue;
    }
    const parentAddress =
      entry.extensions?.bridgeInfo?.[String(bridge.parentChainId)]?.tokenAddress;
    if (!parentAddress) {
      continue;
    }
    const childAddress = entry.address.toLowerCase();
    if (seenChildAddresses.has(childAddress)) {
      continue;
    }
    seenChildAddresses.add(childAddress);
    if (
      isExcludedToken(bridge.parentChainId, parentAddress) ||
      isExcludedToken(bridge.childChainId, childAddress)
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
        chainId: bridge.parentChainId,
        address: parentAddress,
        ...metadata,
      }),
      child: normalizeToken({
        chainId: bridge.childChainId,
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
      parent.chainId === pair.sourceChainId ? [parent, child] : [child, parent];
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

type ChainTokens = {
  source: CachedChainToken[];
  destination: CachedChainToken[];
};

function getCoinKeyMap(tokens: CachedChainToken[]): Map<Address, string | undefined> {
  return new Map(tokens.map((token) => [token.address, token.coinKey]));
}

// LiFi matches a source token to a destination token by coinKey. The chain entries already hold
// the coinKeys, so the pair build does not fetch LiFi's token metadata a second time.
async function generateLifi(
  pair: ChainPair,
  chainTokens: ChainTokens,
): Promise<{
  providerRoutes: ProviderRoutes | null;
  destinationAddresses: Address[];
}> {
  const connection = await fetchLifiConnection(pair);
  if (!connection) {
    return { providerRoutes: null, destinationAddresses: [] };
  }

  const coinKeysByChainId = new Map([
    [pair.sourceChainId, getCoinKeyMap(chainTokens.source)],
    [pair.destinationChainId, getCoinKeyMap(chainTokens.destination)],
  ]);

  const toLifiToken = (raw: LifiConnectionToken): { address: Address; coinKey?: string } | null => {
    const address = raw.address.toLowerCase() as Address;
    const coinKeys = coinKeysByChainId.get(raw.chainId);
    if (isExcludedToken(raw.chainId, address) || !coinKeys?.has(address)) {
      return null;
    }
    return {
      address,
      coinKey: getCuratedCoinKey(raw.chainId, address) ?? coinKeys.get(address),
    };
  };

  const destinationAddresses: Address[] = [];
  const counterpartByCoinKey = new Map<string, Address>();

  for (const raw of connection.toTokens) {
    const resolved = toLifiToken(raw);
    if (!resolved) {
      continue;
    }
    destinationAddresses.push(resolved.address);
    if (resolved.coinKey && !counterpartByCoinKey.has(resolved.coinKey)) {
      counterpartByCoinKey.set(resolved.coinKey, resolved.address);
    }
  }

  const routes: Record<Address, Address | null> = {};
  for (const raw of connection.fromTokens) {
    const resolved = toLifiToken(raw);
    if (!resolved) {
      continue;
    }
    routes[resolved.address] = resolved.coinKey
      ? (counterpartByCoinKey.get(resolved.coinKey) ?? null)
      : null;
  }

  return { providerRoutes: { provider: 'lifi', routes }, destinationAddresses };
}

// Token metadata is cached once per chain and shared by every pair, so no single entry grows
// with the number of pairs. The chain is implied by the cache key.
type CachedChainToken = Omit<Token, 'id' | 'chainId'> & {
  coinKey?: string;
};

type CachedPairRoutes = {
  providers: ProviderRoutes[];
  lifiDestinationAddresses: Address[];
};

type PairRegistry = {
  providers: ProviderRoutes[];
  sourceTokens: Map<TokenId, Token>;
  destinationTokens: Map<TokenId, Token>;
  lifiDestinationTokens: Map<TokenId, Token>;
  destinationTokensByAddress: Partial<Record<Address, Token>>;
};

function cached<T>(key: string, build: () => Promise<T>): Promise<T> {
  return unstable_cache(
    async () => {
      const value = await build();
      // Next stores the value as a JSON string inside JSON, so its quotes count twice.
      const size = JSON.stringify(JSON.stringify(value)).length;
      if (size > CACHE_ENTRY_BUDGET) {
        console.error(`[token-registry] cache entry ${key} is ${size} bytes`);
      }
      return value;
    },
    [key],
    { revalidate: 3_600, tags: [key] },
  )();
}

function getCanonicalBridgesForChain(chainId: number): CanonicalBridge[] {
  const byChildChainId = new Map<number, CanonicalBridge>();
  for (const pair of supportedPairs) {
    const bridge = getCanonicalBridge(pair);
    if (bridge && (bridge.parentChainId === chainId || bridge.childChainId === chainId)) {
      byChildChainId.set(bridge.childChainId, bridge);
    }
  }
  return [...byChildChainId.values()];
}

async function buildChainTokens(chainId: number): Promise<CachedChainToken[]> {
  const [canonicalEntries, lifiTokens] = await Promise.all([
    Promise.all(
      getCanonicalBridgesForChain(chainId).map(async (bridge) =>
        getCanonicalEntries(await fetchArbedTokenLists(bridge.tokenListUrls), bridge),
      ),
    ),
    fetchLifiChainTokens(chainId),
  ]);

  const tokens: CachedChainToken[] = [
    ...hardcodedTokens.filter((token) => token.chainId === chainId),
    ...canonicalEntries
      .flat()
      .flatMap(({ parent, child }) => [parent, child])
      .filter((token) => token.chainId === chainId),
  ].map(({ id: _id, chainId: _chainId, ...token }) => token);

  for (const metadata of lifiTokens) {
    if (isExcludedToken(chainId, metadata.address)) {
      continue;
    }
    const {
      id: _id,
      chainId: _chainId,
      ...token
    } = normalizeToken({
      chainId,
      address: metadata.address,
      symbol: metadata.symbol,
      name: metadata.name,
      decimals: metadata.decimals,
      logoURI: metadata.logoURI,
    });
    tokens.push(metadata.coinKey ? { ...token, coinKey: metadata.coinKey } : token);
  }

  // The first source of a token wins its metadata. LiFi still adds its coinKey.
  const byAddress = new Map<Address, CachedChainToken>();
  for (const token of tokens) {
    const existing = byAddress.get(token.address);
    if (!existing) {
      byAddress.set(token.address, token);
    } else if (token.coinKey && !existing.coinKey) {
      byAddress.set(token.address, { ...existing, coinKey: token.coinKey });
    }
  }
  return [...byAddress.values()];
}

async function buildPairRoutes(
  pair: ChainPair,
  loadChainTokens: () => Promise<ChainTokens>,
): Promise<CachedPairRoutes> {
  const providers: ProviderRoutes[] = [];
  const bridge = getCanonicalBridge(pair);
  const [listTokens, lifiResult] = await Promise.all([
    bridge ? fetchArbedTokenLists(bridge.tokenListUrls) : Promise.resolve([]),
    loadChainTokens().then((chainTokens) => generateLifi(pair, chainTokens)),
  ]);

  if (bridge) {
    const canonicalRoutes = removeBlockedSourceRoutes(
      pair,
      generateCanonical(getCanonicalEntries(listTokens, bridge), pair).routes,
    );
    if (Object.keys(canonicalRoutes).length > 0) {
      providers.push({ provider: 'canonical', routes: canonicalRoutes });
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

  return { providers, lifiDestinationAddresses: lifiResult.destinationAddresses };
}

function getCachedChainTokens(chainId: number): Promise<CachedChainToken[]> {
  return cached(`token-registry-chain-${chainId}-v${REGISTRY_CACHE_VERSION}`, () =>
    buildChainTokens(chainId),
  );
}

function getCachedPairRoutes(
  pair: ChainPair,
  loadChainTokens: () => Promise<ChainTokens>,
): Promise<CachedPairRoutes> {
  return cached(`token-registry-pair-${pairKey(pair)}-v${REGISTRY_CACHE_VERSION}`, () =>
    buildPairRoutes(pair, loadChainTokens),
  );
}

function getTokenMap(tokens: CachedChainToken[], chainId: number): Map<TokenId, Token> {
  const byId = new Map<TokenId, Token>();
  for (const { coinKey: _coinKey, ...token } of tokens) {
    const id = toTokenId(chainId, token.address);
    byId.set(id, { id, chainId, ...token });
  }
  return byId;
}

function isCanonicalRouteAllowed({
  bridge,
  pair,
  sourceTokenAddress,
  destinationTokenAddress,
}: {
  bridge: CanonicalBridge;
  pair: ChainPair;
  sourceTokenAddress: Address;
  destinationTokenAddress: Address;
}): boolean {
  return isCanonicalTransferAllowed({
    bridge,
    pair,
    parentTokenAddress: isCanonicalDeposit(pair, bridge)
      ? sourceTokenAddress
      : destinationTokenAddress,
  });
}

function withCanonicalPolicy(pair: ChainPair, providers: ProviderRoutes[]): ProviderRoutes[] {
  const bridge = getCanonicalBridge(pair);
  if (!bridge) {
    return providers;
  }

  return providers.map((section) => {
    if (section.provider !== 'canonical') {
      return section;
    }
    const routes: Record<Address, Address> = {};
    for (const [sourceTokenAddress, destinationTokenAddress] of Object.entries(section.routes) as [
      Address,
      Address,
    ][]) {
      if (isCanonicalRouteAllowed({ bridge, pair, sourceTokenAddress, destinationTokenAddress })) {
        routes[sourceTokenAddress] = destinationTokenAddress;
      }
    }
    return { provider: 'canonical', routes };
  });
}

// The entries expire separately, so a route can name a token that its chain entry does not
// have yet. materializeRoutes skips those routes.
async function getPairRegistry(pair: ChainPair): Promise<PairRegistry> {
  const sourceChainTokens = getCachedChainTokens(pair.sourceChainId);
  const destinationChainTokens = getCachedChainTokens(pair.destinationChainId);
  const [routes, sourceTokenEntries, destinationTokenEntries] = await Promise.all([
    getCachedPairRoutes(pair, async () => ({
      source: await sourceChainTokens,
      destination: await destinationChainTokens,
    })),
    sourceChainTokens,
    destinationChainTokens,
  ]);
  const destinationTokens = getTokenMap(destinationTokenEntries, pair.destinationChainId);

  const lifiDestinationTokens = new Map<TokenId, Token>();
  for (const address of routes.lifiDestinationAddresses) {
    const token = destinationTokens.get(toTokenId(pair.destinationChainId, address));
    if (token) {
      lifiDestinationTokens.set(token.id, token);
    }
  }

  return {
    providers: withCanonicalPolicy(pair, routes.providers),
    sourceTokens: getTokenMap(sourceTokenEntries, pair.sourceChainId),
    destinationTokens,
    lifiDestinationTokens,
    destinationTokensByAddress: getTokenAddressMap(destinationTokens.values()),
  };
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

function getTransferableSourceTokens(registry: PairRegistry, pair: ChainPair): Token[] {
  const { providers, sourceTokens, destinationTokens, lifiDestinationTokens } = registry;
  const transferableSourceTokens: Token[] = [];

  for (const sourceAddress of getSourceRouteAddresses(providers)) {
    const sourceToken = sourceTokens.get(toTokenId(pair.sourceChainId, sourceAddress));
    if (!sourceToken) {
      continue;
    }

    const routes = materializeRoutes({
      providers,
      sourceToken,
      destinationTokensByAddress: registry.destinationTokensByAddress,
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

function selectTokenAvailability({
  pair,
  registry,
  sourceTokenAddress,
  destinationTokenAddress,
}: {
  pair: ChainPair;
  registry: PairRegistry;
  sourceTokenAddress: Address;
  destinationTokenAddress?: Address;
}): SelectedTokenAvailability | null {
  const { destinationTokens, lifiDestinationTokens, destinationTokensByAddress } = registry;
  const sourceToken = registry.sourceTokens.get(toTokenId(pair.sourceChainId, sourceTokenAddress));
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
  registry: PairRegistry;
  sourceTokenAddress: Address;
}): Token[] | null {
  const sourceToken = registry.sourceTokens.get(toTokenId(pair.sourceChainId, sourceTokenAddress));
  if (!sourceToken) {
    return null;
  }

  const routes = materializeRoutes({
    providers: registry.providers,
    sourceToken,
    destinationTokensByAddress: registry.destinationTokensByAddress,
  });
  if (routes.length === 0) {
    return null;
  }

  return getDestinationTokenOptions({
    destinationTokensByAddress: registry.destinationTokensByAddress,
    lifiDestinationTokens: registry.lifiDestinationTokens,
    routes,
  });
}

function isBlockedSourceToken(pair: ChainPair, sourceTokenAddress: Address): boolean {
  return blockedSourceRoutes[pairKey(pair)]?.includes(sourceTokenAddress) ?? false;
}

function hasCanonicalRoute(registry: PairRegistry, sourceTokenAddress: Address): boolean {
  return registry.providers.some(
    (section) => section.provider === 'canonical' && sourceTokenAddress in section.routes,
  );
}

function getCachedImport({
  bridge,
  pair,
  sourceTokenAddress,
}: {
  bridge: CanonicalBridge;
  pair: ChainPair;
  sourceTokenAddress: Address;
}): Promise<SelectedTokenAvailability | null> {
  return cached(
    `token-registry-import-${pairKey(pair)}-${sourceTokenAddress}-v${REGISTRY_CACHE_VERSION}`,
    () => resolveImport({ bridge, pair, rawAddress: sourceTokenAddress }),
  );
}

function withImportedRoute(
  registry: PairRegistry,
  { sourceToken, destinationToken }: SelectedTokenAvailability,
): PairRegistry {
  const sourceTokens = new Map(registry.sourceTokens);
  if (!sourceTokens.has(sourceToken.id)) {
    sourceTokens.set(sourceToken.id, sourceToken);
  }
  const destinationTokens = new Map(registry.destinationTokens);
  if (!destinationTokens.has(destinationToken.id)) {
    destinationTokens.set(destinationToken.id, destinationToken);
  }

  return {
    ...registry,
    providers: [
      { provider: 'canonical', routes: { [sourceToken.address]: destinationToken.address } },
      ...registry.providers,
    ],
    sourceTokens,
    destinationTokens,
    destinationTokensByAddress: getTokenAddressMap(destinationTokens.values()),
  };
}

// A token can have LiFi routes and still no canonical route, for example when the token
// lists do not know it yet. The import adds the canonical route, which deploys the child
// token on the first deposit.
async function withCanonicalImport({
  pair,
  registry,
  sourceTokenAddress,
}: {
  pair: ChainPair;
  registry: PairRegistry;
  sourceTokenAddress: Address;
}): Promise<{ registry: PairRegistry; sourceTokenAddress: Address }> {
  const unchanged = { registry, sourceTokenAddress };
  const bridge = getCanonicalBridge(pair);
  if (
    !bridge ||
    hasCanonicalRoute(registry, sourceTokenAddress) ||
    isBlockedSourceToken(pair, sourceTokenAddress) ||
    // Skips the RPC calls for deposits that the policy lists already block.
    (isCanonicalDeposit(pair, bridge) &&
      !isCanonicalTransferAllowed({ bridge, pair, parentTokenAddress: sourceTokenAddress }))
  ) {
    return unchanged;
  }

  const imported = await getCachedImport({ bridge, pair, sourceTokenAddress });
  // A destination-chain address resolves to a different source token, so check it again.
  if (
    !imported ||
    isBlockedSourceToken(pair, imported.sourceToken.address) ||
    !isCanonicalRouteAllowed({
      bridge,
      pair,
      sourceTokenAddress: imported.sourceToken.address,
      destinationTokenAddress: imported.destinationToken.address,
    })
  ) {
    return unchanged;
  }

  return {
    registry: withImportedRoute(registry, imported),
    sourceTokenAddress: imported.sourceToken.address,
  };
}

function getBatchDeposit({
  pair,
  registry,
  sourceToken,
}: {
  pair: ChainPair;
  registry: PairRegistry;
  sourceToken: Token;
}): BatchDeposit | undefined {
  const bridge = getCanonicalBridge(pair);
  if (
    !bridge ||
    !isCanonicalDeposit(pair, bridge) ||
    isNativeToken(sourceToken) ||
    batchDepositExcludedSourceTokens[pairKey(pair)]?.includes(sourceToken.address)
  ) {
    return undefined;
  }

  // Canonical bridges with a custom gas token are not supported yet, so the extra amount is
  // always the native token on both chains.
  const batchSourceToken = registry.sourceTokens.get(
    toTokenId(pair.sourceChainId, NATIVE_TOKEN_ADDRESS),
  );
  const batchDestinationToken = registry.destinationTokens.get(
    toTokenId(pair.destinationChainId, NATIVE_TOKEN_ADDRESS),
  );
  if (!batchSourceToken || !batchDestinationToken) {
    return undefined;
  }

  return {
    sourceToken: batchSourceToken,
    destinationToken: batchDestinationToken,
  };
}

// Only the canonical route can carry the extra amount, so other routes never get a batch.
function withBatchDeposit({
  pair,
  registry,
  selection,
}: {
  pair: ChainPair;
  registry: PairRegistry;
  selection: SelectedTokenAvailability;
}): SelectedTokenAvailability {
  const batchDeposit = getBatchDeposit({ pair, registry, sourceToken: selection.sourceToken });
  if (!batchDeposit) {
    return selection;
  }

  return {
    ...selection,
    availableRoutes: selection.availableRoutes.map((route) =>
      route.provider === 'canonical' ? { ...route, batchDeposit } : route,
    ),
  };
}

export function getSourceTokens(pair: ChainPair): Promise<Token[] | null> {
  if (!isSupportedPair(pair)) {
    return Promise.resolve(null);
  }
  return getPairRegistry(pair).then((registry) => getTransferableSourceTokens(registry, pair));
}

export async function getDestinationTokensForSource({
  pair,
  sourceTokenAddress,
}: {
  pair: ChainPair;
  sourceTokenAddress: string;
}): Promise<Token[] | null> {
  if (!isSupportedPair(pair)) {
    return null;
  }

  const resolved = await withCanonicalImport({
    pair,
    registry: await getPairRegistry(pair),
    sourceTokenAddress: normalizeAddress(sourceTokenAddress),
  });
  return getIndexedDestinationTokenOptions({ pair, ...resolved });
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

  const resolved = await withCanonicalImport({
    pair,
    registry: await getPairRegistry(pair),
    sourceTokenAddress: normalizeAddress(sourceTokenAddress),
  });
  const selection = selectTokenAvailability({
    pair,
    ...resolved,
    destinationTokenAddress: destinationTokenAddress
      ? normalizeAddress(destinationTokenAddress)
      : undefined,
  });

  return selection ? withBatchDeposit({ pair, registry: resolved.registry, selection }) : null;
}
