import { gql } from '@apollo/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';

const query = gql`
  {
    messageSents {
      id
    }
  }
`;

describe('getCctpSubgraphClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('reports the source used by each query after fallback and recovery', async () => {
    const indexerOrigin = 'https://indexer.example';
    let indexerRequests = 0;

    vi.stubEnv('INDEXER_API_URL', indexerOrigin);
    vi.stubEnv('THE_GRAPH_NETWORK_API_KEY', 'test-api-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();

        if (url.startsWith(indexerOrigin)) {
          indexerRequests += 1;
          if (indexerRequests === 1) {
            throw new Error('indexer unavailable');
          }
        }

        return new Response(JSON.stringify({ data: { messageSents: [] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );

    vi.resetModules();
    const { getCctpSubgraphClient } = await import('../ServerSubgraphUtils');
    const client = getCctpSubgraphClient(ChainId.Ethereum);

    const fallbackResult = await client.query<{ messageSents: { id: string }[] }>({ query });
    const recoveredResult = await client.query<{ messageSents: { id: string }[] }>({ query });

    expect(fallbackResult.source).toBe('https://gateway.thegraph.com');
    expect(recoveredResult.source).toBe(indexerOrigin);
  });
});
