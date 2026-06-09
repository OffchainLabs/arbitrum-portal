import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Simple, opt-in API-key gate for the Earn API.
 *
 * Intended for preview/internal deployments where the Earn endpoints are shared
 * with a known set of whitelisted developers who integrate them into their own
 * workflows (server-to-server). It is bearer-token auth — anyone holding a key
 * can call the API — which is appropriate for trusted internal/partner access.
 *
 * Behaviour:
 * - Keys are read from the `EARN_API_KEYS` env var (comma-separated allowlist),
 *   so adding/revoking a developer is a one-line env change + redeploy.
 * - When `EARN_API_KEYS` is unset (e.g. production, where the first-party UI
 *   consumes these routes), the gate is a no-op and behaviour is unchanged.
 * - Same-origin browser requests (the deployment's own UI) are allowed through
 *   without a key via fetch-metadata, so the preview site keeps working.
 * - External callers must present the key as `Authorization: Bearer <key>` or
 *   `x-api-key: <key>`.
 */

const AUTHORIZATION_BEARER = /^Bearer\s+(.+)$/i;

function getConfiguredKeys(): string[] {
  return (process.env.EARN_API_KEYS ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
}

function extractPresentedKey(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const match = AUTHORIZATION_BEARER.exec(authHeader.trim());
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  const apiKeyHeader = request.headers.get('x-api-key');
  return apiKeyHeader?.trim() || null;
}

// Browsers attach `Sec-Fetch-Site` on requests they originate; the deployment's
// own UI sends `same-origin`/`same-site`. External server-to-server callers
// don't send it, so they fall through to the key check.
function isSameOriginRequest(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');
  return fetchSite === 'same-origin' || fetchSite === 'same-site';
}

// Hash both inputs to a fixed-length digest so the constant-time comparison
// doesn't leak key length, then compare without short-circuiting.
function keysMatch(expected: string, presented: string): boolean {
  const expectedHash = createHash('sha256').update(expected).digest();
  const presentedHash = createHash('sha256').update(presented).digest();
  return timingSafeEqual(expectedHash, presentedHash);
}

function unauthorized(message: string, code: string): NextResponse {
  return NextResponse.json(
    { message, code },
    { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
  );
}

/**
 * Returns `{ key }` when the request is allowed (the matched key, usable as a
 * per-developer rate-limit bucket; `null` when auth is disabled or the caller
 * is same-origin), or a `401` `NextResponse` when it must be rejected.
 */
export function requireEarnApiKey(request: Request): { key: string | null } | NextResponse {
  const configuredKeys = getConfiguredKeys();

  // Auth is opt-in: no keys configured → access unchanged.
  if (configuredKeys.length === 0) {
    return { key: null };
  }

  // Let the deployment's own UI through without shipping a key to the browser.
  if (isSameOriginRequest(request)) {
    return { key: null };
  }

  const presented = extractPresentedKey(request);
  if (!presented) {
    return unauthorized(
      'Missing API key. Provide an "Authorization: Bearer <key>" or "x-api-key" header.',
      'MISSING_API_KEY',
    );
  }

  const matched = configuredKeys.find((key) => keysMatch(key, presented));
  if (!matched) {
    return unauthorized('Invalid API key.', 'INVALID_API_KEY');
  }

  return { key: matched };
}
