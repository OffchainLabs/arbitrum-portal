import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../../types/ChainId';
import { isChildChainIndexed } from '../../../../util/txHistory/sources';
import { GET } from './block-number';

vi.mock('../../../../util/txHistory/sources', () => ({
  isChildChainIndexed: vi.fn(),
}));

const isChildChainIndexedMock = vi.mocked(isChildChainIndexed);

function getBlockNumber(chainId: number) {
  return GET({} as never, { params: Promise.resolve({ chainId: String(chainId) }) });
}

describe.sequential('GET /api/chains/[chainId]/block-number', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    isChildChainIndexedMock.mockReturnValue(true);
    vi.stubEnv(
      'INDEXER_API_URL_BY_CHAIN',
      JSON.stringify({
        [ChainId.Ethereum]: 'https://indexer.test',
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

  it('returns the indexer block for an indexed child chain', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      // the indexer serializes `id` as a string -> exercises the Number() coercion
      json: async () => ({
        arbNova: { id: String(ChainId.ArbitrumNova), block: { number: 12345 } },
      }),
    });

    const response = await getBlockNumber(ChainId.ArbitrumNova);

    expect(await response.json()).toEqual({
      meta: { source: 'arbitrum-indexer' },
      data: 12345,
    });
    expect(fetchMock).toHaveBeenCalledWith('https://indexer.test/status', expect.anything());
  });

  it('preserves the parent-chain block-number path through the indexer', async () => {
    isChildChainIndexedMock.mockReturnValue(false);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ethereum: { id: String(ChainId.Ethereum), block: { number: 999 } } }),
    });

    const response = await getBlockNumber(ChainId.Ethereum);

    expect(await response.json()).toEqual({ meta: { source: 'arbitrum-indexer' }, data: 999 });
    expect(fetchMock).toHaveBeenCalledWith('https://indexer.test/status', expect.anything());
  });

  it('returns a 502 (not a misleading success) when the indexer block number cannot be fetched', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });

    const response = await getBlockNumber(ChainId.ArbitrumOne);

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      message: `Indexer status failed with 503 for chain ${ChainId.ArbitrumOne}`,
    });
  });

  it('returns a 502 for an indexed chain that has no entry in the map', async () => {
    const response = await getBlockNumber(ChainId.ArbitrumSepolia);

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      message: `No indexer configured for chain ${ChainId.ArbitrumSepolia}`,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a 502 naming the chain when the indexer status does not list it', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ethereum: { id: '1', block: { number: 999 } } }),
    });

    const response = await getBlockNumber(ChainId.ArbitrumOne);

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      message: `Indexer status does not report chain ${ChainId.ArbitrumOne}`,
    });
  });

  it('answers 0 for a chain nothing serves, rather than a failure', async () => {
    isChildChainIndexedMock.mockReturnValue(false);

    const response = await getBlockNumber(33139);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
