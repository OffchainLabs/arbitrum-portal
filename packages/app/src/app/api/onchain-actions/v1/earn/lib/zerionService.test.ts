import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchZerionCurrentPrices } from './zerionService';

type FetchMock = ReturnType<typeof vi.fn>;

function mockOkJson(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
  } as Response;
}

function mockErrorResponse(status: number): Response {
  return {
    ok: false,
    status,
    statusText: 'Server Error',
    json: async () => ({}),
  } as Response;
}

function getCallUrl(fetchMock: FetchMock, callIndex: number): URL {
  const arg = fetchMock.mock.calls[callIndex]?.[0];
  if (typeof arg !== 'string') throw new Error('expected fetch to be called with a URL string');
  return new URL(arg);
}

describe('fetchZerionCurrentPrices', () => {
  const originalApiKey = process.env.ZERION_API_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.ZERION_API_KEY = 'test-key';
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.ZERION_API_KEY;
    } else {
      process.env.ZERION_API_KEY = originalApiKey;
    }
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns an empty map when given no lookups, without calling fetch', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchZerionCurrentPrices([]);

    expect(result.size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws if ZERION_API_KEY is not set', async () => {
    delete process.env.ZERION_API_KEY;
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      fetchZerionCurrentPrices([{ kind: 'implementation', implementation: 'ethereum:0xabc' }]),
    ).rejects.toThrow(/ZERION_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches prices by implementation and maps the response back to the cache key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockOkJson({
        data: [
          {
            id: 'eth-fungible',
            attributes: {
              market_data: { price: 1234.56 },
              implementations: [{ chain_id: 'ethereum', address: '0xabc' }],
            },
          },
        ],
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchZerionCurrentPrices([
      { kind: 'implementation', implementation: 'ethereum:0xabc' },
    ]);

    expect(result.get('impl:ethereum:0xabc')).toBe(1234.56);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = getCallUrl(fetchMock, 0);
    expect(url.pathname).toBe('/v1/fungibles/');
    expect(url.searchParams.get('filter[fungible_implementations]')).toBe('ethereum:0xabc');
    expect(url.searchParams.get('currency')).toBe('usd');
  });

  it('fetches prices by fungibleId and maps the response back to the cache key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockOkJson({
        data: [
          {
            id: 'fung-1',
            attributes: { market_data: { price: 7.5 }, implementations: [] },
          },
        ],
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchZerionCurrentPrices([{ kind: 'fungibleId', fungibleId: 'fung-1' }]);

    expect(result.get('id:fung-1')).toBe(7.5);
    const url = getCallUrl(fetchMock, 0);
    expect(url.searchParams.get('filter[fungible_ids]')).toBe('fung-1');
  });

  it('issues separate requests for implementations and fungibleIds when both are present', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: string) => {
      const url = new URL(input);
      if (url.searchParams.has('filter[fungible_implementations]')) {
        return mockOkJson({
          data: [
            {
              id: 'eth-fungible',
              attributes: {
                market_data: { price: 100 },
                implementations: [{ chain_id: 'ethereum', address: '0xabc' }],
              },
            },
          ],
        });
      }
      return mockOkJson({
        data: [{ id: 'fung-1', attributes: { market_data: { price: 200 } } }],
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchZerionCurrentPrices([
      { kind: 'implementation', implementation: 'ethereum:0xabc' },
      { kind: 'fungibleId', fungibleId: 'fung-1' },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.get('impl:ethereum:0xabc')).toBe(100);
    expect(result.get('id:fung-1')).toBe(200);
  });

  it('deduplicates repeated lookups in the request URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockOkJson({
        data: [
          {
            id: 'eth-fungible',
            attributes: {
              market_data: { price: 50 },
              implementations: [{ chain_id: 'ethereum', address: '0xabc' }],
            },
          },
        ],
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchZerionCurrentPrices([
      { kind: 'implementation', implementation: 'ethereum:0xabc' },
      { kind: 'implementation', implementation: 'ethereum:0xabc' },
      { kind: 'implementation', implementation: 'ethereum:0xabc' },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const filter = getCallUrl(fetchMock, 0).searchParams.get('filter[fungible_implementations]');
    expect(filter).toBe('ethereum:0xabc');
  });

  it('chunks implementation lookups at the batch size (25)', async () => {
    const lookups = Array.from({ length: 26 }, (_, i) => ({
      kind: 'implementation' as const,
      implementation: `ethereum:0x${i.toString().padStart(40, '0')}` as `${string}:${string}`,
    }));

    const fetchMock = vi.fn().mockResolvedValue(mockOkJson({ data: [] }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchZerionCurrentPrices(lookups);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstFilter = getCallUrl(fetchMock, 0).searchParams.get(
      'filter[fungible_implementations]',
    );
    const secondFilter = getCallUrl(fetchMock, 1).searchParams.get(
      'filter[fungible_implementations]',
    );
    expect(firstFilter?.split(',')).toHaveLength(25);
    expect(secondFilter?.split(',')).toHaveLength(1);
  });

  it('leaves missing entries as null when the response omits them', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockOkJson({ data: [] }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchZerionCurrentPrices([
      { kind: 'implementation', implementation: 'ethereum:0xabc' },
      { kind: 'fungibleId', fungibleId: 'fung-1' },
    ]);

    expect(result.get('impl:ethereum:0xabc')).toBeNull();
    expect(result.get('id:fung-1')).toBeNull();
  });

  it('returns null for a non-OK response without throwing, leaving other prices intact', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi.fn().mockImplementation(async (input: string) => {
      const url = new URL(input);
      if (url.searchParams.has('filter[fungible_implementations]')) {
        return mockErrorResponse(500);
      }
      return mockOkJson({
        data: [{ id: 'fung-1', attributes: { market_data: { price: 9 } } }],
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchZerionCurrentPrices([
      { kind: 'implementation', implementation: 'ethereum:0xabc' },
      { kind: 'fungibleId', fungibleId: 'fung-1' },
    ]);

    expect(result.get('impl:ethereum:0xabc')).toBeNull();
    expect(result.get('id:fung-1')).toBe(9);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('keeps prices as null when market_data is missing from the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockOkJson({
        data: [
          {
            id: 'eth-fungible',
            attributes: {
              implementations: [{ chain_id: 'ethereum', address: '0xabc' }],
            },
          },
        ],
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchZerionCurrentPrices([
      { kind: 'implementation', implementation: 'ethereum:0xabc' },
    ]);

    expect(result.get('impl:ethereum:0xabc')).toBeNull();
  });
});
