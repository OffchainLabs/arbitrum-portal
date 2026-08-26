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

// A label for `meta.source`, never a URL — our endpoints stay behind the API.
const INDEXER_SOURCE = 'arbitrum-indexer';

type SubgraphKey = keyof typeof subgraphs;

export type SubgraphSource = SubgraphKey | typeof INDEXER_SOURCE;

/** An Apollo client paired with the label to report it as. */
type SourcedClient = {
  client: ApolloClient<NormalizedCacheObject>;
  source: SubgraphSource;
};

type Subgraph =
  | { kind: 'self-hosted'; name: string }
  | { kind: 'graph-network'; subgraphId: string }
  // pin to one known-good indexer when others serve incomplete data:
  // https://github.com/graphprotocol/graph-node/issues/6683
  | { kind: 'pinned'; deploymentId: string; indexer: string };

// Lunanova (https://thegraph.lunanova.tech), verified complete
const lunanovaIndexer = '0xe13840a2e92e0cb17a246609b432d0fa2e418774';

const subgraphs = {
  // CCTP Mainnet Subgraphs
  'cctp-ethereum': {
    kind: 'pinned',
    deploymentId: 'QmWgi6hNfwCGiTAhH7gTSMSfvvYUPRbBQSjRmvuviRGGwy',
    indexer: lunanovaIndexer,
  },
  'cctp-arbitrum-one': {
    kind: 'pinned',
    deploymentId: 'QmQtNd36amtQ8h8GF5rwkLLWyyBGwqad3j3WgZAMuLvDMd',
    indexer: lunanovaIndexer,
  },
  // CCTP Testnet Subgraphs
  'cctp-sepolia': {
    kind: 'graph-network',
    subgraphId: '4gSU1PTxjYPWk2TXPX2fusjuXrBFHC7kCZrbhrhaF9V5',
  },
  'cctp-arbitrum-sepolia': {
    kind: 'graph-network',
    subgraphId: '4Dp9ENSFDKfeBsmZeSyATKKrhxC2EKzbC3bZvTHpU1DB',
  },
  // L1 Mainnet Subgraphs
  'l1-arbitrum-one': {
    kind: 'graph-network',
    subgraphId: 'F2N4nGH86Y5Bk2vPo15EVRSTz2wbtz7BGRe8DDJqMPG4',
  },
  'l1-arbitrum-nova': {
    kind: 'graph-network',
    subgraphId: '6Xvyjk9r91N3DSRQP6UZ1Lkbou567hFxLSWt2Tsv5AWp',
  },
  // L1 Testnet Subgraphs
  'l1-arbitrum-sepolia': {
    kind: 'graph-network',
    subgraphId: 'GF6Ez7sY2gef8EoXrR76X6iFa41wf38zh4TXZkDkL5Z9',
  },
  // L2 Mainnet Subgraphs
  'l2-arbitrum-one': {
    kind: 'graph-network',
    subgraphId: '9eFk14Tms68qBN7YwL6kFuk9e2BVRqkX6gXyjzLR3tuj',
  },
  // L2 Nova Subgraphs
  'l2-arbitrum-nova': {
    kind: 'self-hosted',
    name: 'arbitrum-nova/layer2-token-gateway',
  },
  // L2 Testnet Subgraphs
  'l2-arbitrum-sepolia': {
    kind: 'graph-network',
    subgraphId: 'AaUuKWWuQbCXbvRkXpVDEpw9B7oVicYrovNyMLPZtLPw',
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

function createTheGraphNetworkClient(subgraphId: string) {
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

function createSubgraphClient(key: SubgraphKey): SourcedClient {
  const subgraph = subgraphs[key];
  logger.debug(`[createSubgraphClient] key=${key} kind=${subgraph.kind}`);

  return { client: createClientFor(subgraph), source: key };
}

function createClientFor(subgraph: Subgraph): ApolloClient<NormalizedCacheObject> {
  switch (subgraph.kind) {
    case 'self-hosted':
      return createSelfHostedSubgraphClient(subgraph.name);

    case 'graph-network':
      return createTheGraphNetworkClient(subgraph.subgraphId);

    case 'pinned':
      return createPinnedIndexerClient(subgraph.deploymentId, subgraph.indexer);
  }
}

type CctpQueryResult<T> = ApolloQueryResult<MaybeMasked<T>> & {
  source: SubgraphSource;
};

/**
 * The subset of the Apollo client surface the CCTP route consumes. Deliberately
 * query-only: a query may be served by either backend, so there is no single
 * `link` that describes the client — whichever answered comes back as `source`.
 */
export type CctpSubgraphClient = {
  query<T = unknown, TVariables extends OperationVariables = OperationVariables>(
    options: QueryOptions<TVariables, T>,
  ): Promise<CctpQueryResult<T>>;
};

/**
 * Queries `primary`, falling back to `createFallback()` on failure. The fallback
 * is built lazily, so a missing Graph API key is fine while the indexer holds,
 * and reused, so repeated failures don't rebuild it.
 */
function createCctpSubgraphClient(
  primary: SourcedClient,
  createFallback?: () => SourcedClient,
): CctpSubgraphClient {
  let fallback: SourcedClient | undefined;

  return {
    query: async <T = unknown, TVariables extends OperationVariables = OperationVariables>(
      options: QueryOptions<TVariables, T>,
    ): Promise<CctpQueryResult<T>> => {
      try {
        return { ...(await primary.client.query<T, TVariables>(options)), source: primary.source };
      } catch (error) {
        if (typeof createFallback === 'undefined') {
          throw error;
        }

        logger.warn(
          `[getCctpSubgraphClient] "${primary.source}" query failed, falling back`,
          error,
        );
        fallback ??= createFallback();
        return {
          ...(await fallback.client.query<T, TVariables>(options)),
          source: fallback.source,
        };
      }
    },
  };
}

/**
 * Indexer base URL for `chainId` from `INDEXER_API_URL_BY_CHAIN`
 * (`{"42161":"https://indexer.example"}`) — chains sit on separate deployments.
 * `undefined` for anything unusable, so a bad map degrades to the subgraph.
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

  // Some proxies read the resulting `//api/v1/...` as a different, missing path.
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

  // /api/v1 only: the replica postdates the indexer's API versioning, no alias.
  return createCctpSubgraphClient(
    {
      client: createApolloClient(`${indexerApiBaseUrl}/api/v1/cctp/graphql/${chainId}`),
      source: INDEXER_SOURCE,
    },
    () => createSubgraphClient(subgraphKey),
  );
}

export function getL1SubgraphClient(l2ChainId: number): SourcedClient {
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

export function getL2SubgraphClient(l2ChainId: number): SourcedClient {
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
