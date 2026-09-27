import { NextRequest, NextResponse } from 'next/server';

import { getSelectedTokenAvailability } from '@/app/src/token-registry/server/generate';

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

  const searchParams = request.nextUrl.searchParams;
  const selection = await getSelectedTokenAvailability({
    pair,
    sourceTokenAddress: searchParams.get('sourceToken') ?? undefined,
    destinationTokenAddress: searchParams.get('destinationToken') ?? undefined,
  });

  if (!selection) {
    return NextResponse.json(
      {
        error: `No selected token route for chain pair: ${sourceChainId} -> ${destinationChainId}`,
      },
      { status: 404 },
    );
  }

  return NextResponse.json(selection, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
