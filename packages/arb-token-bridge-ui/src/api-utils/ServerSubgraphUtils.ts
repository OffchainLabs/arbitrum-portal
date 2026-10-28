import { ApolloClient, HttpLink, InMemoryCache, NormalizedCacheObject } from '@apollo/client';
import ApolloLinkTimeout from 'apollo-link-timeout';

import { ChainId } from '../types/ChainId';
import { getIndexerApiUrl } from './ServerIndexerUtils';

// Labels, never URLs — our endpoints stay behind the API.
export type SubgraphSource = 'arbitrum-indexer';

function createApolloClient(uri: string) {
  const timeoutLink = new ApolloLinkTimeout();
  const httpLink = timeoutLink.concat(
    new HttpLink({
      uri,
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
    }),
  );

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
  });
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
