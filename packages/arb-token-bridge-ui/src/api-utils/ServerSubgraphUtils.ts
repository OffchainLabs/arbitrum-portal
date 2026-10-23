import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

import { ChainId } from '../types/ChainId';
import { logger } from '../util/logger';
import { getIndexerApiUrl } from './ServerIndexerUtils';

/**
 * The API key to be used for calls to The Graph Network.
 */
const theGraphNetworkApiKey = process.env.THE_GRAPH_NETWORK_API_KEY;

const selfHostedSubgraphApiKey = process.env.SELF_HOSTED_SUBGRAPH_API_KEY;

/**
 * Subgraph requests are aborted after this long. Same default as the
 * apollo-link-timeout link used before Apollo Client 4.
 */
const SUBGRAPH_REQUEST_TIMEOUT_MS = 15_000;

type SubgraphKey = keyof typeof subgraphs;

// Labels, never URLs — our endpoints stay behind the API. Routes report one of
// these, so no endpoint of ours can be assigned to `meta.source` at all.
export type SubgraphSource = SubgraphKey | 'arbitrum-indexer';

/** An Apollo client paired with the label to report it as. */
type SourcedClient = {
  client: ApolloClient;
  source: SubgraphSource;
};

type Subgraph =
  | { kind: 'self-hosted'; name: string }
  | { kind: 'graph-network'; subgraphId: string };

const subgraphs = {
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

/**
 * Apollo Client 4 types query `data` as possibly undefined. With the default
 * errorPolicy ('none') a failed query throws, so missing data is unexpected.
 */
export function getQueryData<TData>(result: { data?: TData }): TData {
  if (typeof result.data === 'undefined') {
    throw new Error('Subgraph query returned no data');
  }
  return result.data;
}

function createApolloClient(uri: string, headers?: Record<string, string>) {
  const httpLink = new HttpLink({
    uri,
    headers,
    fetch: (url, options) => {
      const timeoutSignal = AbortSignal.timeout(SUBGRAPH_REQUEST_TIMEOUT_MS);
      return fetch(url, {
        ...options,
        cache: 'no-store',
        signal: options?.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal,
      });
    },
  });

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

function createSubgraphClient(key: SubgraphKey): SourcedClient {
  const subgraph = subgraphs[key];
  logger.debug(`[createSubgraphClient] key=${key} kind=${subgraph.kind}`);

  return { client: createClientFor(subgraph), source: key };
}

function createClientFor(subgraph: Subgraph): ApolloClient {
  switch (subgraph.kind) {
    case 'self-hosted':
      return createSelfHostedSubgraphClient(subgraph.name);

    case 'graph-network':
      return createTheGraphNetworkClient(subgraph.subgraphId);
  }
}

const cctpChainIds: readonly ChainId[] = [
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
export function getCctpSubgraphClient(chainId: number): ApolloClient {
  if (!cctpChainIds.includes(chainId)) {
    throw new Error(`[getCctpSubgraphClient] unsupported chain: ${chainId}`);
  }

  const indexerApiBaseUrl = getIndexerApiUrl(chainId);

  if (typeof indexerApiBaseUrl === 'undefined') {
    throw new Error(`[getCctpSubgraphClient] no indexer configured for chain: ${chainId}`);
  }

  // /api/v1 only: the replica postdates the indexer's API versioning, no alias.
  return createApolloClient(`${indexerApiBaseUrl}/api/v1/cctp/graphql/${chainId}`);
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
