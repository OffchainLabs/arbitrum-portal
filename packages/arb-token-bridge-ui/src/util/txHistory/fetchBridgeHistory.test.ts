import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { fetchBridgeHistory } from './fetchBridgeHistory';

const query = {
  sender: '0x1234567890123456789012345678901234567890',
  fromBlock: 0,
  toBlock: 1_000_000,
  l2ChainId: ChainId.ArbitrumNova,
  pageSize: 10,
  pageNumber: 0,
  searchString: '',
};

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

describe.sequential('fetchBridgeHistory', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('unwraps `data` on a 200', async () => {
    stubResponse({ status: 200, body: JSON.stringify({ data: [{ id: '0x01' }] }) });

    await expect(fetchBridgeHistory({ route: 'deposits', query })).resolves.toEqual([
      { id: '0x01' },
    ]);
  });

  it.each(['deposits', 'withdrawals', 'eth-deposits-custom-destination'] as const)(
    'sends the query to /api/%s',
    async (route) => {
      const fetchMock = stubResponse({ status: 200, body: JSON.stringify({ data: [] }) });

      await fetchBridgeHistory({ route, query });

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain(`/api/${route}?`);
      expect(url).toContain(`page=0`);
      expect(url).toContain(`l2ChainId=${ChainId.ArbitrumNova}`);
    },
  );

  it.each([502, 500, 400])('throws on a %i instead of returning empty history', async (status) => {
    stubResponse({ status, body: errorBody });

    await expect(fetchBridgeHistory({ route: 'deposits', query })).rejects.toThrow(String(status));
  });

  it('throws even when the error body is not JSON', async () => {
    stubResponse({ status: 502, body: '<html>Bad Gateway</html>' });

    await expect(fetchBridgeHistory({ route: 'deposits', query })).rejects.toThrow('502');
  });

  it('does not call the route for a zero page size', async () => {
    const fetchMock = stubResponse({ status: 502, body: errorBody });

    await expect(
      fetchBridgeHistory({ route: 'deposits', query: { ...query, pageSize: 0 } }),
    ).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
