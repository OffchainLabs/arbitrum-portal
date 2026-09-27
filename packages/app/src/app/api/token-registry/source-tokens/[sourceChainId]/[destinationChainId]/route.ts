import { NextRequest, NextResponse } from 'next/server';

import { getSourceTokens } from '@/app/src/token-registry/server/generate';

export const revalidate = 3_600;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceChainId: string; destinationChainId: string }> },
) {
  const { sourceChainId, destinationChainId } = await params;
  const pair = {
    sourceChainId: Number(sourceChainId),
    destinationChainId: Number(destinationChainId),
  };

  const tokens = await getSourceTokens(pair);

  if (!tokens) {
    return NextResponse.json(
      {
        error: `Unsupported chain pair: ${sourceChainId} -> ${destinationChainId}`,
      },
      { status: 404 },
    );
  }

  return NextResponse.json(tokens, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
