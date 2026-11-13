import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { proxyToIndexer } from './indexer';

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
