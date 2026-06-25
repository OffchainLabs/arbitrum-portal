import { NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { requireEarnApiKey } from './apiKeyAuth';

const ORIGINAL_KEYS = process.env.EARN_API_KEYS;

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://example.com/api/onchain-actions/v1/earn/opportunities', { headers });
}

describe('requireEarnApiKey', () => {
  beforeEach(() => {
    process.env.EARN_API_KEYS = 'key_alice, key_bob';
  });

  afterEach(() => {
    if (ORIGINAL_KEYS === undefined) {
      delete process.env.EARN_API_KEYS;
    } else {
      process.env.EARN_API_KEYS = ORIGINAL_KEYS;
    }
  });

  it('is a no-op when EARN_API_KEYS is unset (auth disabled)', () => {
    delete process.env.EARN_API_KEYS;
    const result = requireEarnApiKey(makeRequest());
    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toEqual({ key: null });
  });

  it('allows same-origin requests through without a key', () => {
    const result = requireEarnApiKey(makeRequest({ 'sec-fetch-site': 'same-origin' }));
    expect(result).toEqual({ key: null });
  });

  it('rejects external requests with no key (401 MISSING_API_KEY)', async () => {
    const result = requireEarnApiKey(makeRequest());
    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: 'MISSING_API_KEY' });
  });

  it('rejects an unknown key (401 INVALID_API_KEY)', async () => {
    const result = requireEarnApiKey(makeRequest({ authorization: 'Bearer nope' }));
    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_API_KEY' });
  });

  it('accepts a valid key via Authorization: Bearer and returns it', () => {
    const result = requireEarnApiKey(makeRequest({ authorization: 'Bearer key_alice' }));
    expect(result).toEqual({ key: 'key_alice' });
  });

  it('accepts a valid key via x-api-key header', () => {
    const result = requireEarnApiKey(makeRequest({ 'x-api-key': 'key_bob' }));
    expect(result).toEqual({ key: 'key_bob' });
  });
});
