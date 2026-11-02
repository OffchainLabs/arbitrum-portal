import { NextRequest, NextResponse } from 'next/server';

import { getDestinationChains } from '@/app/src/token-registry/server/registryFiles';

export const revalidate = 3_600;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const preferredChainId = searchParams.get('preferredChainId');
  const preferredToken = searchParams.get('preferredToken');
  const chains = await getDestinationChains({
    sourceChainId: Number(searchParams.get('sourceChainId')),
    sourceTokenAddress: (searchParams.get('sourceToken') ?? '').toLowerCase(),
    preferredToken:
      preferredChainId && preferredToken
        ? { chainId: Number(preferredChainId), address: preferredToken.toLowerCase() }
        : undefined,
  });

  return NextResponse.json(chains, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
