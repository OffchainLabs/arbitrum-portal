import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getL2SubgraphClient } from '../../../../api-utils/ServerSubgraphUtils';
import { ChainId } from '../../../../types/ChainId';
import { hasBridgeHistory, isChildChainIndexed } from '../../../../util/txHistory/sources';
import { GET } from './block-number';

vi.mock('../../../../util/txHistory/sources', () => ({
  hasBridgeHistory: vi.fn(),
  isChildChainIndexed: vi.fn(),
}));

vi.mock('../../../../api-utils/ServerSubgraphUtils', () => ({
  getL1SubgraphClient: vi.fn(),
  getL2SubgraphClient: vi.fn(),
}));

const hasBridgeHistoryMock = vi.mocked(hasBridgeHistory);
const isChildChainIndexedMock = vi.mocked(isChildChainIndexed);
const getL2SubgraphClientMock = vi.mocked(getL2SubgraphClient);

function getBlockNumber(chainId: number) {
  return GET({} as never, { params: Promise.resolve({ chainId: String(chainId) }) });
}

describe.sequential('GET /api/chains/[chainId]/block-number', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    hasBridgeHistoryMock.mockReturnValue(true);
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
    expect(await response.json()).toEqual({ message: 'Unable to fetch indexer block number' });
    // failures must not fall through to the subgraph either
    expect(getL2SubgraphClientMock).not.toHaveBeenCalled();
  });

  it('returns a 502 for an indexed chain that has no entry in the map', async () => {
    isChildChainIndexedMock.mockReturnValue(true);

    const response = await getBlockNumber(ChainId.ArbitrumSepolia);

    expect(response.status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces a subgraph failure as a 502', async () => {
    isChildChainIndexedMock.mockReturnValue(false);
    hasBridgeHistoryMock.mockReturnValue(true);
    getL2SubgraphClientMock.mockReturnValue({
      client: { query: vi.fn().mockRejectedValue(new Error('subgraph unavailable')) },
      source: 'l2-arbitrum-nova',
    } as never);

    const response = await getBlockNumber(ChainId.ArbitrumNova);

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ message: 'subgraph unavailable' });
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

  it('answers 0 for a chain nothing serves, rather than a failure', async () => {
    hasBridgeHistoryMock.mockReturnValue(false);

    const response = await getBlockNumber(ChainId.ArbitrumOne);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getL2SubgraphClientMock).not.toHaveBeenCalled();
  });
});
