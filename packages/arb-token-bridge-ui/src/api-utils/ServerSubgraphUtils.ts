import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

import { ChainId } from '../types/ChainId';
import { getIndexerApiUrl } from './ServerIndexerUtils';

// Labels, never URLs — our endpoints stay behind the API.
export type SubgraphSource = 'arbitrum-indexer';

/**
 * Subgraph requests are aborted after this long. Same default as the
 * apollo-link-timeout link used before Apollo Client 4.
 */
const SUBGRAPH_REQUEST_TIMEOUT_MS = 15_000;

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

function createApolloClient(uri: string) {
  const httpLink = new HttpLink({
    uri,
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
