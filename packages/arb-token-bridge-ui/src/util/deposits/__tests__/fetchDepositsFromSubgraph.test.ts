import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchDepositsFromSubgraph } from '../fetchDepositsFromSubgraph';

const query = {
  sender: '0x5d64a0fd6af0d76a7ed189d4061ffa6823fbf97e',
  l2ChainId: 42161,
  fromBlock: 14309825,
  toBlock: 14428639,
  pageSize: 100,
};

function stubResponse(data: unknown[]) {
  const body = JSON.stringify({ data });
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => JSON.parse(body),
    text: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe.sequential('fetchDepositsFromSubgraph', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns an empty history response', async () => {
    stubResponse([]);

    await expect(fetchDepositsFromSubgraph(query)).resolves.toEqual([]);
  });

  it('returns deposits from the bridge-history API', async () => {
    const deposits = [
      { id: '42161-1', transactionHash: '0x01' },
      { id: '42161-2', transactionHash: '0x02' },
    ];
    const fetchMock = stubResponse(deposits);

    await expect(fetchDepositsFromSubgraph(query)).resolves.toEqual(deposits);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/api/deposits?');
  });

  it('does not request an empty block range', async () => {
    const fetchMock = stubResponse([]);

    await expect(
      fetchDepositsFromSubgraph({ ...query, fromBlock: query.toBlock }),
    ).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
