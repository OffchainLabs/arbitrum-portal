import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isChildChainIndexed } from '../../util/txHistory/sources';
import { isIndexerEnabledForRequest, proxyToIndexer } from './indexer';

vi.mock('../../util/txHistory/sources', () => ({
  isChildChainIndexed: vi.fn(),
}));

const isChildChainIndexedMock = vi.mocked(isChildChainIndexed);

const INDEXED_CHAIN_ID = 660279;
const NON_INDEXED_CHAIN_ID = 42161;

function requestForChain(l2ChainId?: number) {
  const url = l2ChainId
    ? `https://app.test/api/withdrawals?l2ChainId=${l2ChainId}`
    : 'https://app.test/api/withdrawals';
  return { url } as never;
}

describe.sequential('isIndexerEnabledForRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isChildChainIndexedMock.mockImplementation((chainId) => chainId === INDEXED_CHAIN_ID);
  });

  it('routes an indexed chain to the indexer', () => {
    expect(isIndexerEnabledForRequest(requestForChain(INDEXED_CHAIN_ID))).toBe(true);
    expect(isChildChainIndexedMock).toHaveBeenCalledWith(INDEXED_CHAIN_ID);
  });

  it('routes a non-indexed chain to the subgraph', () => {
    expect(isIndexerEnabledForRequest(requestForChain(NON_INDEXED_CHAIN_ID))).toBe(false);
  });

  it('falls back to the subgraph when l2ChainId is missing', () => {
    expect(isIndexerEnabledForRequest(requestForChain())).toBe(false);
    expect(isChildChainIndexedMock).not.toHaveBeenCalled();
  });
});

describe.sequential('proxyToIndexer', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv(
      'INDEXER_API_URL_BY_CHAIN',
      JSON.stringify({ [INDEXED_CHAIN_ID]: 'https://indexer.test' }),
    );
    fetchMock = vi.fn().mockResolvedValue({ status: 200, json: async () => ({ data: [] }) });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('forwards the query string to the host configured for the child chain', async () => {
    await proxyToIndexer(requestForChain(INDEXED_CHAIN_ID), '/api/bridge-history/withdrawals');

    expect(fetchMock).toHaveBeenCalledWith(
      `https://indexer.test/api/bridge-history/withdrawals?l2ChainId=${INDEXED_CHAIN_ID}`,
      expect.anything(),
    );
  });

  // A chain routed to the indexer but absent from the map has no host to ask.
  // Failing loudly beats falling back to whichever host happens to be first.
  it('returns a 502 when the child chain has no entry in the map', async () => {
    const response = await proxyToIndexer(
      requestForChain(NON_INDEXED_CHAIN_ID),
      '/api/bridge-history/withdrawals',
    );

    expect(response.status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a 502 when the request carries no l2ChainId', async () => {
    const response = await proxyToIndexer(requestForChain(), '/api/bridge-history/withdrawals');

    expect(response.status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
