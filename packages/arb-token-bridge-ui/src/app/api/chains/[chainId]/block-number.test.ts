import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getL2SubgraphClient,
  getSourceFromSubgraphClient,
} from '../../../../api-utils/ServerSubgraphUtils';
import { ChainId } from '../../../../types/ChainId';
import { isChildChainIndexed } from '../../../../util/txHistory/sources';
import { GET } from './block-number';

vi.mock('../../../../util/txHistory/sources', () => ({
  isChildChainIndexed: vi.fn(),
}));

vi.mock('../../../../api-utils/ServerSubgraphUtils', () => ({
  getL1SubgraphClient: vi.fn(),
  getL2SubgraphClient: vi.fn(),
  getSourceFromSubgraphClient: vi.fn(),
}));

const isChildChainIndexedMock = vi.mocked(isChildChainIndexed);
const getL2SubgraphClientMock = vi.mocked(getL2SubgraphClient);
const getSourceFromSubgraphClientMock = vi.mocked(getSourceFromSubgraphClient);

function getBlockNumber(chainId: number) {
  return GET({} as never, { params: Promise.resolve({ chainId: String(chainId) }) });
}

describe.sequential('GET /api/chains/[chainId]/block-number', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('INDEXER_API_URL', 'https://indexer.test');
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns the indexer block and bypasses the subgraph for an indexed chain (indexer wins when both exist)', async () => {
    // Arbitrum One has a subgraph client, but it is also configured as indexed
    isChildChainIndexedMock.mockReturnValue(true);
    fetchMock.mockResolvedValue({
      ok: true,
      // the indexer serializes `id` as a string -> exercises the Number() coercion
      json: async () => ({
        arbOne: { id: String(ChainId.ArbitrumOne), block: { number: 12345 } },
      }),
    });

    const response = await getBlockNumber(ChainId.ArbitrumOne);
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

  it('uses the subgraph for a non-indexed chain', async () => {
    isChildChainIndexedMock.mockReturnValue(false);
    const query = vi.fn().mockResolvedValue({ data: { _meta: { block: { number: 999 } } } });
    getL2SubgraphClientMock.mockReturnValue({ query } as never);
    getSourceFromSubgraphClientMock.mockReturnValue('arbitrum-one-subgraph');

    const response = await getBlockNumber(ChainId.ArbitrumOne);
    const body = await response.json();

    expect(body).toEqual({ meta: { source: 'arbitrum-one-subgraph' }, data: 999 });
    expect(query).toHaveBeenCalled();
    // the indexer is never consulted for a non-indexed chain
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
