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

const indexerOrigin = 'https://indexer.example';
const otherIndexerOrigin = 'https://indexer-2.example';
const subgraphOrigin = 'https://gateway.thegraph.com';

const emptyResult = () =>
  new Response(JSON.stringify({ data: { messageSents: [] } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * Records every request URL and lets a test decide which ones blow up, keyed by
 * origin — a substring match would also accept `https://indexer.example.evil`.
 */
function stubFetch(failRequest: (origin: string, callCount: number) => boolean) {
  const urls: string[] = [];
  const callsByOrigin: Record<string, number> = {};

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      urls.push(url);

      const { origin } = new URL(url);
      callsByOrigin[origin] = (callsByOrigin[origin] ?? 0) + 1;

      if (failRequest(origin, callsByOrigin[origin])) {
        throw new Error(`${origin} unavailable`);
      }

      return emptyResult();
    }),
  );

  return {
    urls,
    countFor: (origin: string) => callsByOrigin[origin] ?? 0,
  };
}

function stubIndexerApiUrlByChain(urlByChainId: Record<number, string> | string) {
  vi.stubEnv(
    'INDEXER_API_URL_BY_CHAIN',
    typeof urlByChainId === 'string' ? urlByChainId : JSON.stringify(urlByChainId),
  );
}

async function loadGetCctpSubgraphClient() {
  vi.resetModules();
  const { getCctpSubgraphClient } = await import('../ServerSubgraphUtils');
  return getCctpSubgraphClient;
}

// Sequential: these cases stub the same globals (env, fetch) and re-import the
// module under test, so running them concurrently would let them stomp on each
// other's stubs.
describe.sequential('getCctpSubgraphClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('reports the source used by each query after fallback and recovery', async () => {
    stubIndexerApiUrlByChain({ [ChainId.Ethereum]: indexerOrigin });
    vi.stubEnv('THE_GRAPH_NETWORK_API_KEY', 'test-api-key');
    const fetchStub = stubFetch((origin, callCount) => origin === indexerOrigin && callCount === 1);

    const getCctpSubgraphClient = await loadGetCctpSubgraphClient();
    const client = getCctpSubgraphClient(ChainId.Ethereum);

    const fallbackResult = await client.query<{ messageSents: { id: string }[] }>({ query });
    const recoveredResult = await client.query<{ messageSents: { id: string }[] }>({ query });

    expect(fallbackResult.source).toBe(subgraphOrigin);
    expect(recoveredResult.source).toBe(indexerOrigin);
    expect(fetchStub.countFor(subgraphOrigin)).toBe(1);
  });

  it('queries the indexer and never touches the subgraph while it succeeds', async () => {
    stubIndexerApiUrlByChain({ [ChainId.ArbitrumOne]: indexerOrigin });
    vi.stubEnv('THE_GRAPH_NETWORK_API_KEY', 'test-api-key');
    const fetchStub = stubFetch(() => false);

    const getCctpSubgraphClient = await loadGetCctpSubgraphClient();
    const result = await getCctpSubgraphClient(ChainId.ArbitrumOne).query<{
      messageSents: { id: string }[];
    }>({ query });

    expect(result.source).toBe(indexerOrigin);
    expect(fetchStub.urls).toEqual([`${indexerOrigin}/api/v1/cctp/graphql/${ChainId.ArbitrumOne}`]);
    expect(fetchStub.countFor(subgraphOrigin)).toBe(0);
  });

  it('sends each chain to the indexer configured for it', async () => {
    stubIndexerApiUrlByChain({
      [ChainId.Ethereum]: indexerOrigin,
      [ChainId.ArbitrumOne]: otherIndexerOrigin,
    });
    vi.stubEnv('THE_GRAPH_NETWORK_API_KEY', 'test-api-key');
    const fetchStub = stubFetch(() => false);

    const getCctpSubgraphClient = await loadGetCctpSubgraphClient();
    await getCctpSubgraphClient(ChainId.Ethereum).query<{ messageSents: { id: string }[] }>({
      query,
    });
    await getCctpSubgraphClient(ChainId.ArbitrumOne).query<{ messageSents: { id: string }[] }>({
      query,
    });

    expect(fetchStub.urls).toEqual([
      `${indexerOrigin}/api/v1/cctp/graphql/${ChainId.Ethereum}`,
      `${otherIndexerOrigin}/api/v1/cctp/graphql/${ChainId.ArbitrumOne}`,
    ]);
  });

  it('reuses one fallback client across consecutive indexer failures', async () => {
    stubIndexerApiUrlByChain({ [ChainId.Ethereum]: indexerOrigin });
    vi.stubEnv('THE_GRAPH_NETWORK_API_KEY', 'test-api-key');
    const fetchStub = stubFetch((origin) => origin === indexerOrigin);

    const getCctpSubgraphClient = await loadGetCctpSubgraphClient();
    const client = getCctpSubgraphClient(ChainId.Ethereum);

    const first = await client.query<{ messageSents: { id: string }[] }>({ query });
    const second = await client.query<{ messageSents: { id: string }[] }>({ query });

    expect(first.source).toBe(subgraphOrigin);
    expect(second.source).toBe(subgraphOrigin);
    // A client rebuilt per failure would bring a cold cache and refetch.
    expect(fetchStub.countFor(subgraphOrigin)).toBe(1);
  });

  it('tolerates a trailing slash on a configured indexer URL', async () => {
    stubIndexerApiUrlByChain({ [ChainId.Ethereum]: `${indexerOrigin}/` });
    vi.stubEnv('THE_GRAPH_NETWORK_API_KEY', 'test-api-key');
    const fetchStub = stubFetch(() => false);

    const getCctpSubgraphClient = await loadGetCctpSubgraphClient();
    await getCctpSubgraphClient(ChainId.Ethereum).query<{ messageSents: { id: string }[] }>({
      query,
    });

    expect(fetchStub.urls).toEqual([`${indexerOrigin}/api/v1/cctp/graphql/${ChainId.Ethereum}`]);
  });

  // Every unusable map must degrade to the subgraph, never fail the request.
  it.each([
    ['an unset variable', ''],
    ['a chain missing from the map', JSON.stringify({ [ChainId.ArbitrumOne]: indexerOrigin })],
    ['malformed JSON', '{"1": '],
    ['a JSON array', `["${indexerOrigin}"]`],
    ['a non-URL value', JSON.stringify({ [ChainId.Ethereum]: 'not a url' })],
  ])('queries the subgraph for Ethereum given %s', async (_label, rawEnvValue) => {
    stubIndexerApiUrlByChain(rawEnvValue);
    vi.stubEnv('THE_GRAPH_NETWORK_API_KEY', 'test-api-key');
    const fetchStub = stubFetch(() => false);

    const getCctpSubgraphClient = await loadGetCctpSubgraphClient();
    const result = await getCctpSubgraphClient(ChainId.Ethereum).query<{
      messageSents: { id: string }[];
    }>({ query });

    expect(result.source).toBe(subgraphOrigin);
    expect(fetchStub.countFor(indexerOrigin)).toBe(0);
  });

  it('throws for a chain without a CCTP subgraph', async () => {
    const getCctpSubgraphClient = await loadGetCctpSubgraphClient();

    expect(() => getCctpSubgraphClient(ChainId.ArbitrumNova)).toThrow(
      `[getCctpSubgraphClient] unsupported chain: ${ChainId.ArbitrumNova}`,
    );
  });
});
