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

const emptyResult = () =>
  new Response(JSON.stringify({ data: { messageSents: [] } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

// Records request URLs; failures keyed by origin, since a substring match
// would also accept `https://indexer.example.evil`.
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

  return { urls };
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

// Sequential: these share stubbed globals and re-import the module under test.
describe.sequential('getCctpSubgraphClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  // `meta.source` is the route's to set now that there is one backend, and its
  // type is a union of labels — a URL can no longer be assigned to it at all.
  it('queries the indexer', async () => {
    stubIndexerApiUrlByChain({ [ChainId.ArbitrumOne]: indexerOrigin });
    const fetchStub = stubFetch(() => false);

    const getCctpSubgraphClient = await loadGetCctpSubgraphClient();
    await getCctpSubgraphClient(ChainId.ArbitrumOne).query<{
      messageSents: { id: string }[];
    }>({ query });

    expect(fetchStub.urls).toEqual([`${indexerOrigin}/api/v1/cctp/graphql/${ChainId.ArbitrumOne}`]);
  });

  // Nowhere left to fall back to, so a failure must surface, not return other data.
  it('propagates an indexer failure instead of falling back', async () => {
    stubIndexerApiUrlByChain({ [ChainId.Ethereum]: indexerOrigin });
    const fetchStub = stubFetch((origin) => origin === indexerOrigin);

    const getCctpSubgraphClient = await loadGetCctpSubgraphClient();

    await expect(
      getCctpSubgraphClient(ChainId.Ethereum).query<{ messageSents: { id: string }[] }>({ query }),
    ).rejects.toThrow();
    expect(fetchStub.urls).toEqual([`${indexerOrigin}/api/v1/cctp/graphql/${ChainId.Ethereum}`]);
  });

  it('sends each chain to the indexer configured for it', async () => {
    stubIndexerApiUrlByChain({
      [ChainId.Ethereum]: indexerOrigin,
      [ChainId.ArbitrumOne]: otherIndexerOrigin,
    });
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

  it('tolerates a trailing slash on a configured indexer URL', async () => {
    stubIndexerApiUrlByChain({ [ChainId.Ethereum]: `${indexerOrigin}/` });
    const fetchStub = stubFetch(() => false);

    const getCctpSubgraphClient = await loadGetCctpSubgraphClient();
    await getCctpSubgraphClient(ChainId.Ethereum).query<{ messageSents: { id: string }[] }>({
      query,
    });

    expect(fetchStub.urls).toEqual([`${indexerOrigin}/api/v1/cctp/graphql/${ChainId.Ethereum}`]);
  });

  // No subgraph left to degrade to. Which maps don't resolve: ServerIndexerUtils.test.
  it('throws for a chain missing from the map', async () => {
    stubIndexerApiUrlByChain({ [ChainId.ArbitrumOne]: indexerOrigin });
    const fetchStub = stubFetch(() => false);

    const getCctpSubgraphClient = await loadGetCctpSubgraphClient();

    expect(() => getCctpSubgraphClient(ChainId.Ethereum)).toThrow(
      `[getCctpSubgraphClient] no indexer configured for chain: ${ChainId.Ethereum}`,
    );
    expect(fetchStub.urls).toEqual([]);
  });

  it('throws for a chain CCTP does not support', async () => {
    const getCctpSubgraphClient = await loadGetCctpSubgraphClient();

    expect(() => getCctpSubgraphClient(ChainId.ArbitrumNova)).toThrow(
      `[getCctpSubgraphClient] unsupported chain: ${ChainId.ArbitrumNova}`,
    );
  });
});

// The API keys are read at module load, so stub them before importing.
async function loadSubgraphClients() {
  vi.resetModules();
  vi.stubEnv('THE_GRAPH_NETWORK_API_KEY', 'the-graph-key');
  vi.stubEnv('SELF_HOSTED_SUBGRAPH_API_KEY', 'self-hosted-key');
  const { getL1SubgraphClient, getL2SubgraphClient } = await import('../ServerSubgraphUtils');
  return { getL1SubgraphClient, getL2SubgraphClient };
}

// Nova is the only chain whose bridge history still comes from a subgraph; every
// other chain is served by the indexer, so asking for one is a configuration bug
// and must throw rather than resolve a client that queries the wrong backend.
describe.sequential('getL1SubgraphClient / getL2SubgraphClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('resolves both Nova subgraphs', async () => {
    const { getL1SubgraphClient, getL2SubgraphClient } = await loadSubgraphClients();

    expect(getL1SubgraphClient(ChainId.ArbitrumNova).source).toBe('l1-arbitrum-nova');
    expect(getL2SubgraphClient(ChainId.ArbitrumNova).source).toBe('l2-arbitrum-nova');
  });

  it.each([
    ['Arbitrum One', ChainId.ArbitrumOne],
    ['Arbitrum Sepolia', ChainId.ArbitrumSepolia],
  ])('throws for %s, now served by the indexer', async (_label, chainId) => {
    const { getL1SubgraphClient, getL2SubgraphClient } = await loadSubgraphClients();

    expect(() => getL1SubgraphClient(chainId)).toThrow(
      `[getL1SubgraphClient] unsupported chain: ${chainId}`,
    );
    expect(() => getL2SubgraphClient(chainId)).toThrow(
      `[getL2SubgraphClient] unsupported chain: ${chainId}`,
    );
  });
});
