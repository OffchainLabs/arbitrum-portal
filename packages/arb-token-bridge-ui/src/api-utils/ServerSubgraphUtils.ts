import { ApolloClient, HttpLink, InMemoryCache, NormalizedCacheObject } from '@apollo/client';
import ApolloLinkTimeout from 'apollo-link-timeout';

import { ChainId } from '../types/ChainId';
import { logger } from '../util/logger';
import { getIndexerApiUrl } from './ServerIndexerUtils';

/**
 * The API key to be used for calls to The Graph Network.
 */
const theGraphNetworkApiKey = process.env.THE_GRAPH_NETWORK_API_KEY;

const selfHostedSubgraphApiKey = process.env.SELF_HOSTED_SUBGRAPH_API_KEY;

type SubgraphKey = keyof typeof subgraphs;

// Labels, never URLs — our endpoints stay behind the API. Routes report one of
// these, so no endpoint of ours can be assigned to `meta.source` at all.
export type SubgraphSource = SubgraphKey | 'arbitrum-indexer';

/** An Apollo client paired with the label to report it as. */
type SourcedClient = {
  client: ApolloClient<NormalizedCacheObject>;
  source: SubgraphSource;
};

type Subgraph =
  | { kind: 'self-hosted'; name: string }
  | { kind: 'graph-network'; subgraphId: string };

const subgraphs = {
  'l1-arbitrum-nova': {
    kind: 'graph-network',
    subgraphId: '6Xvyjk9r91N3DSRQP6UZ1Lkbou567hFxLSWt2Tsv5AWp',
  },
  'l2-arbitrum-nova': {
    kind: 'self-hosted',
    name: 'arbitrum-nova/layer2-token-gateway',
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
export function getCctpSubgraphClient(chainId: number): ApolloClient<NormalizedCacheObject> {
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
    case ChainId.ArbitrumNova:
      return createSubgraphClient('l1-arbitrum-nova');

    default:
      throw new Error(`[getL1SubgraphClient] unsupported chain: ${l2ChainId}`);
  }
}

export function getL2SubgraphClient(l2ChainId: number): SourcedClient {
  switch (l2ChainId) {
    case ChainId.ArbitrumNova:
      return createSubgraphClient('l2-arbitrum-nova');

    default:
      throw new Error(`[getL2SubgraphClient] unsupported chain: ${l2ChainId}`);
  }
}
