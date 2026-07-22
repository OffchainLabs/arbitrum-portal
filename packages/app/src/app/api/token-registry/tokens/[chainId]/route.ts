import { NextRequest, NextResponse } from 'next/server';

import { supportedChainIds } from '@/app/src/token-registry/constants';
import { getChainTokens } from '@/app/src/token-registry/server/generate';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chainId: string }> },
) {
  const { chainId: rawChainId } = await params;
  const chainId = Number(rawChainId);

  if (!supportedChainIds.includes(chainId)) {
    return NextResponse.json({ error: `Unsupported chain: ${rawChainId}` }, { status: 404 });
  }

  const tokens = await getChainTokens(chainId);

  return NextResponse.json(tokens, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=3600',
    },
  });
}
