import { type NextRequest, NextResponse } from 'next/server';

import { ValidationError } from './validation';

const CORS_ALLOWED_METHODS = 'GET,POST,OPTIONS';
const CORS_ALLOWED_HEADERS = 'Content-Type, Authorization';
const CORS_MAX_AGE_SECONDS = '86400';

function parseAllowedOrigins(): string[] {
  const raw = process.env.ONCHAIN_ACTIONS_ALLOWED_ORIGINS;
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function resolveAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  if (!origin) {
    return null;
  }

  if (origin === request.nextUrl.origin) {
    return origin;
  }

  const allowedOrigins = parseAllowedOrigins();
  if (allowedOrigins.includes(origin)) {
    return origin;
  }

  return null;
}

function getCorsHeaders(request: NextRequest): Record<string, string> {
  const allowedOrigin = resolveAllowedOrigin(request);
  if (!allowedOrigin) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': CORS_ALLOWED_METHODS,
    'Access-Control-Allow-Headers': CORS_ALLOWED_HEADERS,
    'Access-Control-Max-Age': CORS_MAX_AGE_SECONDS,
    'Vary': 'Origin',
  };
}

function mergeHeaders(request: NextRequest, initHeaders?: HeadersInit): Headers {
  const headers = new Headers(initHeaders);
  const corsHeaders = getCorsHeaders(request);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return headers;
}

export function assertCorsOriginAllowed(request: NextRequest): void {
  const origin = request.headers.get('origin');
  if (!origin) {
    return;
  }

  const allowedOrigin = resolveAllowedOrigin(request);
  if (!allowedOrigin) {
    throw new ValidationError(
      'CORS_ORIGIN_NOT_ALLOWED',
      `Origin ${origin} is not allowed. Configure ONCHAIN_ACTIONS_ALLOWED_ORIGINS if needed.`,
      403,
    );
  }
}

export function jsonResponse(
  request: NextRequest,
  payload: unknown,
  init?: Omit<ResponseInit, 'headers'> & { headers?: HeadersInit },
) {
  return NextResponse.json(payload, {
    ...init,
    headers: mergeHeaders(request, init?.headers),
  });
}

export function errorResponse(
  request: NextRequest,
  error: unknown,
  fallback: { code: string; message: string; status?: number },
) {
  if (error instanceof ValidationError) {
    return jsonResponse(
      request,
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  return jsonResponse(
    request,
    { error: { code: fallback.code, message: fallback.message } },
    { status: fallback.status ?? 500 },
  );
}

export function optionsResponse(request: NextRequest) {
  try {
    assertCorsOriginAllowed(request);
    return new NextResponse(null, {
      status: 204,
      headers: mergeHeaders(request),
    });
  } catch (error) {
    return errorResponse(request, error, {
      code: 'CORS_ORIGIN_NOT_ALLOWED',
      message: 'Origin is not allowed',
      status: 403,
    });
  }
}
