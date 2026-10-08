import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchLatestIndexedBlockNumber } from '../SubgraphUtils';
import { isChildChainIndexed } from '../txHistory/sources';

vi.mock('../txHistory/sources', () => ({
  isChildChainIndexed: vi.fn(),
}));

const isChildChainIndexedMock = vi.mocked(isChildChainIndexed);

describe.sequential('fetchLatestIndexedBlockNumber', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('answers 0 without a request for a chain with no bridge history', async () => {
    isChildChainIndexedMock.mockReturnValue(false);

    await expect(fetchLatestIndexedBlockNumber(41923)).resolves.toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks the route for a chain with bridge history', async () => {
    isChildChainIndexedMock.mockReturnValue(true);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ data: 12345 })));

    await expect(fetchLatestIndexedBlockNumber(42161)).resolves.toBe(12345);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/chains/42161/block-number'),
      expect.anything(),
    );
  });

  it('throws when the route fails for a chain with bridge history', async () => {
    isChildChainIndexedMock.mockReturnValue(true);
    fetchMock.mockResolvedValue(new Response('indexer down', { status: 502 }));

    await expect(fetchLatestIndexedBlockNumber(42161)).rejects.toThrow('failed with 502');
  });
});
