import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { fetchDepositsFromSubgraph } from '../deposits/fetchDepositsFromSubgraph';
import { fetchEthDepositsToCustomDestinationFromSubgraph } from '../deposits/fetchEthDepositsToCustomDestinationFromSubgraph';
import { fetchWithdrawalsFromSubgraph } from '../withdrawals/fetchWithdrawalsFromSubgraph';

// Nova, so the chain guard passes without stubbing NEXT_PUBLIC_INDEXER_CHILD_CHAIN_IDS
// (it is read at module load). Which backend serves it is irrelevant here — every
// one of these fetchers talks to our own route.
const params = {
  sender: '0x1234567890123456789012345678901234567890',
  fromBlock: 0,
  toBlock: 1_000_000,
  l2ChainId: ChainId.ArbitrumNova,
  pageSize: 10,
  pageNumber: 0,
};

// What `proxyToIndexer` returns on failure. The empty `data` array is the trap:
// read it and an indexer outage becomes "this account has no transactions".
const errorBody = JSON.stringify({ data: [], message: 'Indexer unavailable' });

function stubResponse({ status, body }: { status: number; body: string }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(body),
    text: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

type HistoryParams = typeof params;

const fetchers: readonly [string, (params: HistoryParams) => Promise<unknown[]>][] = [
  ['fetchDepositsFromSubgraph', fetchDepositsFromSubgraph],
  ['fetchWithdrawalsFromSubgraph', fetchWithdrawalsFromSubgraph],
  [
    'fetchEthDepositsToCustomDestinationFromSubgraph',
    fetchEthDepositsToCustomDestinationFromSubgraph,
  ],
];

describe.each(fetchers)('%s', (_name, fetchHistory) => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the transactions on a 200', async () => {
    stubResponse({ status: 200, body: JSON.stringify({ data: [] }) });

    await expect(fetchHistory(params)).resolves.toEqual([]);
  });

  it.each([502, 500, 400])('throws on a %i instead of returning empty history', async (status) => {
    stubResponse({ status, body: errorBody });

    await expect(fetchHistory(params)).rejects.toThrow(String(status));
  });

  it('throws even when the error body is not JSON', async () => {
    stubResponse({ status: 502, body: '<html>Bad Gateway</html>' });

    await expect(fetchHistory(params)).rejects.toThrow('502');
  });

  // Nothing was requested, so there is nothing to fail on.
  it('does not call the route for a zero page size', async () => {
    const fetchMock = stubResponse({ status: 502, body: errorBody });

    await expect(fetchHistory({ ...params, pageSize: 0 })).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
