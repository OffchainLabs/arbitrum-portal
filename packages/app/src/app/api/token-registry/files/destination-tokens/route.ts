import { NextRequest, NextResponse } from 'next/server';

import { getDestinationTokens } from '@/app/src/token-registry/server/registryFiles';

export const revalidate = 3_600;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tokens = await getDestinationTokens({
    sourceChainId: Number(searchParams.get('sourceChainId')),
    sourceTokenAddress: (searchParams.get('sourceToken') ?? '').toLowerCase(),
    // Without one, the tokens of every destination chain.
    destinationChainId: searchParams.get('destinationChainId')
      ? Number(searchParams.get('destinationChainId'))
      : undefined,
    query: searchParams.get('q') ?? undefined,
  });

  return NextResponse.json(tokens, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
