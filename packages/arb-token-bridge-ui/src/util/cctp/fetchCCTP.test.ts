import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { fetchCCTPDeposits } from './fetchCCTP';

const params = {
  walletAddress: '0x1234567890123456789012345678901234567890',
  l1ChainId: ChainId.Ethereum,
  pageNumber: 0,
  pageSize: 10,
  connectedToEthereum: true,
  isSmartContractWallet: false,
};

// The shape the route returns on failure: the empty arrays are the trap.
const errorBody = JSON.stringify({
  data: { pending: [], completed: [] },
  error: 'indexer unavailable',
});

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

describe('fetchCCTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the transfers on a 200', async () => {
    stubResponse({
      status: 200,
      body: JSON.stringify({ data: { pending: [], completed: [] }, error: null }),
    });

    await expect(fetchCCTPDeposits(params)).resolves.toEqual({ pending: [], completed: [] });
  });

  // Without this the route's 500 body reads as a successful empty history, so an
  // indexer outage looks like every user having no CCTP transfers.
  it.each([500, 502, 400])('throws on a %i instead of returning empty history', async (status) => {
    stubResponse({ status, body: errorBody });

    await expect(fetchCCTPDeposits(params)).rejects.toThrow(String(status));
  });

  it('throws even when the error body is not JSON', async () => {
    stubResponse({ status: 502, body: '<html>Bad Gateway</html>' });

    await expect(fetchCCTPDeposits(params)).rejects.toThrow('502');
  });

  // Nothing was requested, so there is nothing to fail on.
  it('does not call the API for a zero page size', async () => {
    const fetchMock = stubResponse({ status: 500, body: errorBody });

    await expect(fetchCCTPDeposits({ ...params, pageSize: 0 })).resolves.toEqual({
      pending: [],
      completed: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
