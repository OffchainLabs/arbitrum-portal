import { NextRequest, NextResponse } from 'next/server';

import { isSupportedPair } from '@/app/src/token-registry/constants';
import { getDestinationTokensForSource } from '@/app/src/token-registry/server/generate';
import { NATIVE_TOKEN_ADDRESS } from '@/app/src/token-registry/types';

export const revalidate = 3_600;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceChainId: string; destinationChainId: string }> },
) {
  const { sourceChainId, destinationChainId } = await params;
  const pair = {
    sourceChainId: Number(sourceChainId),
    destinationChainId: Number(destinationChainId),
  };

  if (!isSupportedPair(pair)) {
    return NextResponse.json(
      {
        error: `Unsupported chain pair: ${sourceChainId} -> ${destinationChainId}`,
      },
      { status: 404 },
    );
  }

  const sourceTokenAddress =
    request.nextUrl.searchParams.get('sourceToken') ?? NATIVE_TOKEN_ADDRESS;
  const tokens = await getDestinationTokensForSource({ pair, sourceTokenAddress });

  if (!tokens) {
    return NextResponse.json(
      { error: 'Source token is not transferable on this chain pair' },
      { status: 404 },
    );
  }

  return NextResponse.json(tokens, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
