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
import { getIndexerApiUrl } from './ServerIndexerUtils';

/**
 * The API key to be used for calls to The Graph Network.
 */
const theGraphNetworkApiKey = process.env.THE_GRAPH_NETWORK_API_KEY;

const selfHostedSubgraphApiKey = process.env.SELF_HOSTED_SUBGRAPH_API_KEY;

// Labels for `meta.source`, never URLs — our endpoints stay behind the API.
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
};

const subgraphs = {
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

function createSubgraphClient(key: SubgraphKey) {
  logger.debug(`[createSubgraphClient] key=${key}`);

  const { theGraphNetworkSubgraphId, selfHostedSubgraph }: Subgraph = subgraphs[key];

  if (selfHostedSubgraph !== '') {
    return withSource(createSelfHostedSubgraphClient(selfHostedSubgraph), key);
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
 * query-only, and each result carries the `source` it was served from.
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

const cctpChainIds: number[] = [
  ChainId.Ethereum,
  ChainId.ArbitrumOne,
  ChainId.Sepolia,
  ChainId.ArbitrumSepolia,
];

/**
 * The indexer's replica of the Circle CCTP v1 subgraphs, now the only source of
 * CCTP history. A chain missing from `INDEXER_API_URL_BY_CHAIN` throws rather
 * than degrading, which the route turns into a 500.
 */
export function getCctpSubgraphClient(chainId: number): CctpSubgraphClient {
  if (!cctpChainIds.includes(chainId)) {
    throw new Error(`[getCctpSubgraphClient] unsupported chain: ${chainId}`);
  }

  const indexerApiBaseUrl = getIndexerApiUrl(chainId);

  if (typeof indexerApiBaseUrl === 'undefined') {
    throw new Error(`[getCctpSubgraphClient] no indexer configured for chain: ${chainId}`);
  }

  // /api/v1 only: the replica postdates the indexer's API versioning, no alias.
  return createCctpSubgraphClient(
    withSource(
      createApolloClient(`${indexerApiBaseUrl}/api/v1/cctp/graphql/${chainId}`),
      INDEXER_SOURCE,
    ),
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

// `null` for a client built outside this module: a missing label, not a leaked one.
export function getSourceFromSubgraphClient(
  subgraphClient: ApolloClient<NormalizedCacheObject>,
): string | null {
  return subgraphClientSources.get(subgraphClient) ?? null;
}
