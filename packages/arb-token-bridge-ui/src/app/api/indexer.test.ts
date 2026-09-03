import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isChildChainIndexed } from '../../util/txHistory/sources';
import { isIndexerEnabledForRequest, proxyToIndexer } from './indexer';

// Partial: `parseChainId` is the behaviour under test, not a collaborator.
vi.mock('../../util/txHistory/sources', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../util/txHistory/sources')>()),
  isChildChainIndexed: vi.fn(),
}));

const isChildChainIndexedMock = vi.mocked(isChildChainIndexed);

const INDEXED_CHAIN_ID = 660279;
const NON_INDEXED_CHAIN_ID = 42161;

// Anything a query string can carry that isn't a chain ID. Left as raw strings:
// `Number()` alone turns these into NaN or a fractional "chain" that then reaches
// the map lookup and the error message.
const nonChainIds = [
  ['a word', 'abc'],
  ['a fraction', '1.5'],
  ['zero', '0'],
  ['a negative', '-42161'],
  ['an empty value', ''],
] as const;

function requestForChain(l2ChainId?: number | string) {
  const url =
    typeof l2ChainId === 'undefined'
      ? 'https://app.test/api/withdrawals'
      : `https://app.test/api/withdrawals?l2ChainId=${l2ChainId}`;
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

  // Treated as absent rather than looked up, so no NaN reaches the map.
  it.each(nonChainIds)('falls back to the subgraph given %s', (_label, rawChainId) => {
    expect(isIndexerEnabledForRequest(requestForChain(rawChainId))).toBe(false);
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

  // No host to ask: fail loudly rather than pick whichever host comes first.
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

  it.each(nonChainIds)('returns a 502 given %s', async (_label, rawChainId) => {
    const response = await proxyToIndexer(
      requestForChain(rawChainId),
      '/api/bridge-history/withdrawals',
    );

    expect(response.status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
