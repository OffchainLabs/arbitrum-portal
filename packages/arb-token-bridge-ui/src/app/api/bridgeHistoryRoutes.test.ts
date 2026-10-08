import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isChildChainIndexed } from '../../util/txHistory/sources';
import { GET as getDeposits } from './deposits';
import { GET as getEthDepositsToCustomDestination } from './eth-deposits-custom-destination';
import { GET as getWithdrawals } from './withdrawals';

vi.mock('../../util/txHistory/sources', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../util/txHistory/sources')>()),
  isChildChainIndexed: vi.fn(),
}));

const isChildChainIndexedMock = vi.mocked(isChildChainIndexed);

const INDEXED_CHAIN_ID = 42170;
const NON_INDEXED_CHAIN_ID = 33139;

const routes = [
  ['deposits', getDeposits],
  ['withdrawals', getWithdrawals],
  ['eth-deposits-custom-destination', getEthDepositsToCustomDestination],
] as const;

const SENDER = '0x1234567890123456789012345678901234567890';

function requestWith(route: string, params: Record<string, string>) {
  return new NextRequest(`https://app.test/api/${route}?${new URLSearchParams(params)}`);
}

function request(route: string, l2ChainId: number) {
  return requestWith(route, { sender: SENDER, l2ChainId: String(l2ChainId) });
}

describe.sequential('bridge history routes', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    isChildChainIndexedMock.mockImplementation((chainId) => chainId === INDEXED_CHAIN_ID);
    vi.stubEnv(
      'INDEXER_API_URL_BY_CHAIN',
      JSON.stringify({ [INDEXED_CHAIN_ID]: 'https://indexer.test' }),
    );
    fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] })));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each(routes)('/api/%s proxies an indexed chain to the indexer', async (route, GET) => {
    const response = await GET(request(route, INDEXED_CHAIN_ID));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^https://indexer\\.test/api/bridge-history/${route}\\?`)),
      expect.anything(),
    );
  });

  it.each(routes)('/api/%s rejects a chain the indexer does not serve', async (route, GET) => {
    const response = await GET(request(route, NON_INDEXED_CHAIN_ID));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: `unsupported chain: ${NON_INDEXED_CHAIN_ID}`,
      data: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(routes)('/api/%s asks for a missing or malformed l2ChainId', async (route, GET) => {
    await Promise.all(
      ['', 'abc', '1.5', '0', '-42161'].map(async (rawChainId) => {
        const response = await GET(requestWith(route, { sender: SENDER, l2ChainId: rawChainId }));

        expect(response.status, rawChainId).toBe(400);
        expect(await response.json()).toEqual({ message: '<l2ChainId> is required', data: [] });
      }),
    );
    expect(isChildChainIndexedMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(routes)('/api/%s requires a sender or receiver', async (route, GET) => {
    const response = await GET(requestWith(route, { l2ChainId: String(INDEXED_CHAIN_ID) }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: '<sender> or <receiver> is required',
      data: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(routes)('/api/%s accepts a receiver alone', async (route, GET) => {
    const response = await GET(
      requestWith(route, { receiver: SENDER, l2ChainId: String(INDEXED_CHAIN_ID) }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalled();
  });

  it.each(routes)(
    '/api/%s answers an empty page for a zero or bad pageSize',
    async (route, GET) => {
      await Promise.all(
        ['0', 'abc'].map(async (pageSize) => {
          const response = await GET(
            requestWith(route, { sender: SENDER, l2ChainId: String(INDEXED_CHAIN_ID), pageSize }),
          );

          expect(response.status, pageSize).toBe(200);
          expect(await response.json()).toEqual({ data: [] });
        }),
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
