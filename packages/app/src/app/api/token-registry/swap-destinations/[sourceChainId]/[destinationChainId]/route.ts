import { NextRequest, NextResponse } from 'next/server';

import { getSwapDestinations } from '@/app/src/token-registry/server/generate';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceChainId: string; destinationChainId: string }> },
) {
  const { sourceChainId, destinationChainId } = await params;
  const pair = {
    sourceChainId: Number(sourceChainId),
    destinationChainId: Number(destinationChainId),
  };

  const swapDestinations = await getSwapDestinations(pair);

  if (swapDestinations === null) {
    return NextResponse.json(
      {
        error: `Unsupported chain pair: ${sourceChainId} -> ${destinationChainId}`,
      },
      { status: 404 },
    );
  }

  return NextResponse.json(swapDestinations, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=3600',
    },
  });
}
