import { NextResponse } from 'next/server';

import { ValidationError } from './validation';

export function jsonResponse(payload: unknown, init?: ResponseInit) {
  return NextResponse.json(payload, init);
}

export function errorResponse(
  error: unknown,
  fallback: { code: string; message: string; status?: number },
) {
  if (error instanceof ValidationError) {
    return jsonResponse(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  return jsonResponse(
    { error: { code: fallback.code, message: fallback.message } },
    { status: fallback.status ?? 500 },
  );
}

export function optionsResponse() {
  return new NextResponse(null, { status: 204 });
}
