import { checkRateLimit } from '@vercel/firewall';
import { NextResponse } from 'next/server';

const EARN_RATE_LIMIT_ID = 'earn-api';

export async function enforceEarnRateLimit(
  request: Request,
  options?: { key?: string | null },
): Promise<NextResponse | null> {
  const { rateLimited } = await checkRateLimit(EARN_RATE_LIMIT_ID, {
    request,
    rateLimitKey: options?.key?.trim().toLowerCase() || undefined,
  });

  if (!rateLimited) return null;

  return NextResponse.json(
    { message: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
    {
      status: 429,
      headers: {
        'Cache-Control': 'private, no-store',
        'Retry-After': '60',
      },
    },
  );
}
