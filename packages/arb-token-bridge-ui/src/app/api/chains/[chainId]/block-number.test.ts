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

  it('returns the indexer block for an indexed chain', async () => {
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
  });

  it('returns a 502 (not a misleading success) when the indexer block number cannot be fetched', async () => {
    isChildChainIndexedMock.mockReturnValue(true);
    fetchMock.mockResolvedValue({ ok: false });

    const response = await getBlockNumber(ChainId.ArbitrumOne);

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ message: 'Unable to fetch indexer block number' });
  });

  it('returns a 502 for an indexed chain that has no entry in the map', async () => {
    isChildChainIndexedMock.mockReturnValue(true);

    const response = await getBlockNumber(ChainId.ArbitrumSepolia);

    expect(response.status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 0 for a chain nothing serves, rather than a failure', async () => {
    isChildChainIndexedMock.mockReturnValue(false);

    const response = await getBlockNumber(ChainId.ArbitrumOne);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
