import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getL2SubgraphClient } from '../../../../api-utils/ServerSubgraphUtils';
import { ChainId } from '../../../../types/ChainId';
import { isChildChainIndexed } from '../../../../util/txHistory/sources';
import { GET } from './block-number';

vi.mock('../../../../util/txHistory/sources', () => ({
  isChildChainIndexed: vi.fn(),
}));

vi.mock('../../../../api-utils/ServerSubgraphUtils', () => ({
  getL1SubgraphClient: vi.fn(),
  getL2SubgraphClient: vi.fn(),
}));

const isChildChainIndexedMock = vi.mocked(isChildChainIndexed);
const getL2SubgraphClientMock = vi.mocked(getL2SubgraphClient);

function getBlockNumber(chainId: number) {
  return GET({} as never, { params: Promise.resolve({ chainId: String(chainId) }) });
}

describe.sequential('GET /api/chains/[chainId]/block-number', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv(
      'INDEXER_API_URL_BY_CHAIN',
      JSON.stringify({
        [ChainId.ArbitrumOne]: 'https://indexer.test',
        [ChainId.ArbitrumNova]: 'https://indexer.test',
      }),
    );
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns the indexer block and bypasses the subgraph for an indexed chain (indexer wins when both exist)', async () => {
    // Nova is the only chain left with a subgraph client, so it is the only place
    // "both exist" can still be tested.
    isChildChainIndexedMock.mockReturnValue(true);
    fetchMock.mockResolvedValue({
      ok: true,
      // the indexer serializes `id` as a string -> exercises the Number() coercion
      json: async () => ({
        arbNova: { id: String(ChainId.ArbitrumNova), block: { number: 12345 } },
      }),
    });

    const response = await getBlockNumber(ChainId.ArbitrumNova);
    const body = await response.json();

    expect(body).toEqual({ meta: { source: 'arbitrum-indexer' }, data: 12345 });
    expect(fetchMock).toHaveBeenCalledWith('https://indexer.test/status', expect.anything());
    // the subgraph is never consulted even though a client exists for this chain
    expect(getL2SubgraphClientMock).not.toHaveBeenCalled();
  });

  it('returns a 502 (not a misleading success) when the indexer block number cannot be fetched', async () => {
    isChildChainIndexedMock.mockReturnValue(true);
    fetchMock.mockResolvedValue({ ok: false });

    const response = await getBlockNumber(ChainId.ArbitrumOne);

    expect(response.status).toBe(502);
    // failures must not fall through to the subgraph either
    expect(getL2SubgraphClientMock).not.toHaveBeenCalled();
  });

  it('returns a 502 for an indexed chain that has no entry in the map', async () => {
    // Sepolia is indexed but absent from the map: no host to ask, so this must surface.
    isChildChainIndexedMock.mockReturnValue(true);

    const response = await getBlockNumber(ChainId.ArbitrumSepolia);

    expect(response.status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the subgraph for Nova, the one chain still served by one', async () => {
    isChildChainIndexedMock.mockReturnValue(false);
    const query = vi.fn().mockResolvedValue({ data: { _meta: { block: { number: 999 } } } });
    getL2SubgraphClientMock.mockReturnValue({
      client: { query },
      source: 'l2-arbitrum-nova',
    } as never);

    const response = await getBlockNumber(ChainId.ArbitrumNova);
    const body = await response.json();

    expect(body).toEqual({ meta: { source: 'l2-arbitrum-nova' }, data: 999 });
    expect(query).toHaveBeenCalled();
    // the indexer is never consulted for a non-indexed chain
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Arbitrum One's subgraph is gone, so misconfiguring it out of
  // NEXT_PUBLIC_INDEXER_CHILD_CHAIN_IDS leaves nothing to ask. Documents the
  // pre-existing catch-all rather than endorsing it: `{ data: 0 }` at 200 reads as
  // "nothing indexed yet", which the client turns into a full event-log scan.
  it('falls through to the catch-all for a chain with neither an indexer nor a subgraph', async () => {
    isChildChainIndexedMock.mockReturnValue(false);

    const response = await getBlockNumber(ChainId.ArbitrumOne);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
