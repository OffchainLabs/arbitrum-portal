import {
  ApolloClient,
  ApolloQueryResult,
  HttpLink,
  InMemoryCache,
  MaybeMasked,
  NormalizedCacheObject,
  OperationVariables,
  QueryOptions,
} from '@apollo/client';
import ApolloLinkTimeout from 'apollo-link-timeout';

import { ChainId } from '../types/ChainId';
import { logger } from '../util/logger';

/**
 * The API key to be used for calls to The Graph Network.
 */
const theGraphNetworkApiKey = process.env.THE_GRAPH_NETWORK_API_KEY;

const selfHostedSubgraphApiKey = process.env.SELF_HOSTED_SUBGRAPH_API_KEY;

/**
 * Stable labels for where a query was served from, safe to return to clients:
 * the indexer, or the `SubgraphKey` of the subgraph that answered. Never a URL
 * — responses must not reveal the endpoints we keep behind our API.
 */
const INDEXER_SOURCE = 'arbitrum-indexer';
type SubgraphSource = SubgraphKey | typeof INDEXER_SOURCE;

const subgraphClientSources = new WeakMap<object, SubgraphSource>();

function withSource<TClient extends object>(client: TClient, source: SubgraphSource): TClient {
  subgraphClientSources.set(client, source);
  return client;
}

type SubgraphKey = keyof typeof subgraphs;

type TheGraphNetworkSubgraphId = (typeof subgraphs)[SubgraphKey]['theGraphNetworkSubgraphId'];

type Subgraph = {
  selfHostedSubgraph: string;
  theGraphNetworkSubgraphId: string;
  // pin queries to a single known-good indexer, e.g. while others serve incomplete data
  // due to https://github.com/graphprotocol/graph-node/issues/6683
  deploymentId?: string;
  pinnedIndexer?: string;
};

const subgraphs = {
  // CCTP Mainnet Subgraphs
  'cctp-ethereum': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: 'E6iPLnDGEgrcc4gu9uiHJxENSRAAzTvUJqQqJcHZqJT1',
    deploymentId: 'QmWgi6hNfwCGiTAhH7gTSMSfvvYUPRbBQSjRmvuviRGGwy',
    // Lunanova (https://thegraph.lunanova.tech), verified serving complete data
    pinnedIndexer: '0xe13840a2e92e0cb17a246609b432d0fa2e418774',
  },
  'cctp-arbitrum-one': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: '9DgSggKVrvfi4vdyYTdmSBuPgDfm3D7zfLZ1qaQFjYYW',
    deploymentId: 'QmQtNd36amtQ8h8GF5rwkLLWyyBGwqad3j3WgZAMuLvDMd',
    // Lunanova (https://thegraph.lunanova.tech), verified serving complete data
    pinnedIndexer: '0xe13840a2e92e0cb17a246609b432d0fa2e418774',
  },
  // CCTP Testnet Subgraphs
  'cctp-sepolia': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: '4gSU1PTxjYPWk2TXPX2fusjuXrBFHC7kCZrbhrhaF9V5',
  },
  'cctp-arbitrum-sepolia': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: '4Dp9ENSFDKfeBsmZeSyATKKrhxC2EKzbC3bZvTHpU1DB',
  },
  // L1 Mainnet Subgraphs
  'l1-arbitrum-one': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: 'F2N4nGH86Y5Bk2vPo15EVRSTz2wbtz7BGRe8DDJqMPG4',
  },
  'l1-arbitrum-nova': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: '6Xvyjk9r91N3DSRQP6UZ1Lkbou567hFxLSWt2Tsv5AWp',
  },
  // L1 Testnet Subgraphs
  'l1-arbitrum-sepolia': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: 'GF6Ez7sY2gef8EoXrR76X6iFa41wf38zh4TXZkDkL5Z9',
  },
  // L2 Mainnet Subgraphs
  'l2-arbitrum-one': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: '9eFk14Tms68qBN7YwL6kFuk9e2BVRqkX6gXyjzLR3tuj',
  },
  // L2 Nova Subgraphs
  'l2-arbitrum-nova': {
    selfHostedSubgraph: 'arbitrum-nova/layer2-token-gateway',
    theGraphNetworkSubgraphId: '',
  },
  // L2 Testnet Subgraphs
  'l2-arbitrum-sepolia': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: 'AaUuKWWuQbCXbvRkXpVDEpw9B7oVicYrovNyMLPZtLPw',
  },
} satisfies Record<string, Subgraph>;

function createApolloClient(uri: string, headers?: Record<string, string>) {
  const timeoutLink = new ApolloLinkTimeout();
  const httpLink = timeoutLink.concat(
    new HttpLink({
      uri,
      headers,
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
    }),
  );

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
  });
}

function createSelfHostedSubgraphClient(subgraphName: string) {
  if (typeof selfHostedSubgraphApiKey === 'undefined' || selfHostedSubgraphApiKey === '') {
    throw new Error(
      `[createSelfHostedSubgraphClient] missing "SELF_HOSTED_SUBGRAPH_API_KEY" env variable`,
    );
  }
  return createApolloClient(
    `https://graph.arbitrum.io/${selfHostedSubgraphApiKey}/subgraphs/name/${subgraphName}`,
  );
}

function createTheGraphNetworkClient(subgraphId: TheGraphNetworkSubgraphId) {
  if (typeof theGraphNetworkApiKey === 'undefined' || theGraphNetworkApiKey === '') {
    throw new Error(
      `[createTheGraphNetworkClient] missing "THE_GRAPH_NETWORK_API_KEY" env variable`,
    );
  }

  return createApolloClient(
    `https://gateway-arbitrum.network.thegraph.com/api/${theGraphNetworkApiKey}/subgraphs/id/${subgraphId}`,
  );
}

function createPinnedIndexerClient(deploymentId: string, indexerAddress: string) {
  if (typeof theGraphNetworkApiKey === 'undefined' || theGraphNetworkApiKey === '') {
    throw new Error(`[createPinnedIndexerClient] missing "THE_GRAPH_NETWORK_API_KEY" env variable`);
  }

  return createApolloClient(
    `https://gateway.thegraph.com/api/deployments/id/${deploymentId}/indexers/id/${indexerAddress}`,
    { Authorization: `Bearer ${theGraphNetworkApiKey}` },
  );
}

function createSubgraphClient(key: SubgraphKey) {
  logger.debug(`[createSubgraphClient] key=${key}`);

  const { theGraphNetworkSubgraphId, selfHostedSubgraph, deploymentId, pinnedIndexer }: Subgraph =
    subgraphs[key];

  if (selfHostedSubgraph !== '') {
    return withSource(createSelfHostedSubgraphClient(selfHostedSubgraph), key);
  }

  if ((typeof deploymentId === 'undefined') !== (typeof pinnedIndexer === 'undefined')) {
    throw new Error(
      `[createSubgraphClient] both "deploymentId" and "pinnedIndexer" must be set for "${key}"`,
    );
  }

  if (typeof deploymentId !== 'undefined' && typeof pinnedIndexer !== 'undefined') {
    logger.debug(
      `[createSubgraphClient] using deployment "${deploymentId}" pinned to indexer "${pinnedIndexer}"`,
    );
    return withSource(createPinnedIndexerClient(deploymentId, pinnedIndexer), key);
  }

  logger.debug(
    `[createSubgraphClient] using subgraph "${theGraphNetworkSubgraphId}" on the graph network`,
  );
  return withSource(createTheGraphNetworkClient(theGraphNetworkSubgraphId), key);
}

type CctpQueryResult<T> = ApolloQueryResult<MaybeMasked<T>> & {
  source: string | null;
};

/**
 * The subset of the Apollo client surface the CCTP route consumes. Deliberately
 * query-only: a client may serve a query from either the indexer or the
 * fallback subgraph, so there is no single `link` that describes it — the
 * backend actually used comes back on each result as `source`, as a stable
 * label rather than a URL.
 */
export type CctpSubgraphClient = {
  query<T = unknown, TVariables extends OperationVariables = OperationVariables>(
    options: QueryOptions<TVariables, T>,
  ): Promise<CctpQueryResult<T>>;
};

function createCctpSubgraphClient(
  subgraphClient: ApolloClient<NormalizedCacheObject>,
): CctpSubgraphClient {
  const source = getSourceFromSubgraphClient(subgraphClient);

  return {
    query: async <T = unknown, TVariables extends OperationVariables = OperationVariables>(
      options: QueryOptions<TVariables, T>,
    ): Promise<CctpQueryResult<T>> => ({
      ...(await subgraphClient.query<T, TVariables>(options)),
      source,
    }),
  };
}

/**
 * Queries the arbitrum-indexer's drop-in replica of the Circle CCTP v1
 * subgraphs, falling back to the Circle subgraph on failure. The fallback
 * client is created lazily — so environments without a Graph API key work as
 * long as the indexer is reachable — and then reused, so a run of failing
 * indexer queries doesn't build a new client (and cache) per query.
 */
function createIndexerClientWithSubgraphFallback(
  indexerUri: string,
  fallbackSubgraphKey: SubgraphKey,
): CctpSubgraphClient {
  const indexerClient = withSource(createApolloClient(indexerUri), INDEXER_SOURCE);

  let fallbackClient: ApolloClient<NormalizedCacheObject> | undefined;
  const getFallbackClient = () => {
    fallbackClient ??= createSubgraphClient(fallbackSubgraphKey);
    return fallbackClient;
  };

  return {
    query: async <T = unknown, TVariables extends OperationVariables = OperationVariables>(
      options: QueryOptions<TVariables, T>,
    ): Promise<CctpQueryResult<T>> => {
      try {
        return {
          ...(await indexerClient.query<T, TVariables>(options)),
          source: INDEXER_SOURCE,
        };
      } catch (error) {
        logger.warn(
          `[getCctpSubgraphClient] indexer query failed, falling back to "${fallbackSubgraphKey}"`,
          error,
        );
        const fallback = getFallbackClient();
        return {
          ...(await fallback.query<T, TVariables>(options)),
          source: fallbackSubgraphKey,
        };
      }
    },
  };
}

/**
 * Reads the indexer base URL for `chainId` out of `INDEXER_API_URL_BY_CHAIN`, a
 * JSON object keyed by chain ID (`{"42161":"https://indexer.example"}`). Chains
 * are split across separate indexer deployments, so there is no single host.
 *
 * Returns `undefined` for anything unusable — unparseable JSON, a chain that
 * isn't in the map, a value that isn't a URL — so a misconfigured map degrades
 * to the subgraph instead of failing the request.
 */
function getIndexerApiUrl(chainId: number): string | undefined {
  let urlByChainId: Record<string, unknown>;

  try {
    const parsed: unknown = JSON.parse(process.env.INDEXER_API_URL_BY_CHAIN || '{}');
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('expected a JSON object keyed by chain ID');
    }
    urlByChainId = parsed as Record<string, unknown>;
  } catch (error) {
    logger.error('[getIndexerApiUrl] cannot parse "INDEXER_API_URL_BY_CHAIN"', error);
    return undefined;
  }

  const url = urlByChainId[String(chainId)];
  if (typeof url !== 'string' || url === '') {
    return undefined;
  }

  // Trailing slash trimmed: some proxies and CDNs treat the `//api/v1/...` it
  // would produce as a different, missing path.
  const baseUrl = url.replace(/\/+$/, '');
  return URL.canParse(baseUrl) ? baseUrl : undefined;
}

const cctpSubgraphKeyByChainId: { [chainId: number]: SubgraphKey } = {
  [ChainId.Ethereum]: 'cctp-ethereum',
  [ChainId.ArbitrumOne]: 'cctp-arbitrum-one',
  [ChainId.Sepolia]: 'cctp-sepolia',
  [ChainId.ArbitrumSepolia]: 'cctp-arbitrum-sepolia',
};

export function getCctpSubgraphClient(chainId: number): CctpSubgraphClient {
  const subgraphKey = cctpSubgraphKeyByChainId[chainId];

  if (typeof subgraphKey === 'undefined') {
    throw new Error(`[getCctpSubgraphClient] unsupported chain: ${chainId}`);
  }

  const indexerApiBaseUrl = getIndexerApiUrl(chainId);

  if (typeof indexerApiBaseUrl === 'undefined') {
    return createCctpSubgraphClient(createSubgraphClient(subgraphKey));
  }

  // The indexer serves the CCTP replica under /api/v1 only — it shipped after
  // the indexer's API versioning, so no legacy /api alias exists for it.
  return createIndexerClientWithSubgraphFallback(
    `${indexerApiBaseUrl}/api/v1/cctp/graphql/${chainId}`,
    subgraphKey,
  );
}

export function getL1SubgraphClient(l2ChainId: number) {
  switch (l2ChainId) {
    case ChainId.ArbitrumOne:
      return createSubgraphClient('l1-arbitrum-one');

    case ChainId.ArbitrumNova:
      return createSubgraphClient('l1-arbitrum-nova');

    case ChainId.ArbitrumSepolia:
      return createSubgraphClient('l1-arbitrum-sepolia');

    default:
      throw new Error(`[getL1SubgraphClient] unsupported chain: ${l2ChainId}`);
  }
}

export function getL2SubgraphClient(l2ChainId: number) {
  switch (l2ChainId) {
    case ChainId.ArbitrumOne:
      return createSubgraphClient('l2-arbitrum-one');

    case ChainId.ArbitrumNova:
      return createSubgraphClient('l2-arbitrum-nova');

    case ChainId.ArbitrumSepolia:
      return createSubgraphClient('l2-arbitrum-sepolia');

    default:
      throw new Error(`[getL2SubgraphClient] unsupported chain: ${l2ChainId}`);
  }
}

/**
 * The label for where `subgraphClient` serves queries from — a `SubgraphKey`,
 * or `arbitrum-indexer` — safe to return to clients as `meta.source`. Never a
 * URL: the endpoints stay behind our API. `null` for a client built outside the
 * factories in this module, which is a missing label, not a leaked one.
 */
export function getSourceFromSubgraphClient(
  subgraphClient: ApolloClient<NormalizedCacheObject>,
): string | null {
  return subgraphClientSources.get(subgraphClient) ?? null;
}
