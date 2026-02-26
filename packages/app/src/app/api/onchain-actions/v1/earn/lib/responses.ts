import { NextResponse } from 'next/server';

import { ValidationError } from './validation';

export function errorResponse(
  error: unknown,
  fallback: { code: string; message: string; status?: number },
) {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { error: { code: fallback.code, message: fallback.message } },
    { status: fallback.status ?? 500 },
  );
}
