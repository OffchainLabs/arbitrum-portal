import { NextRequest, NextResponse } from 'next/server';

import { searchRegistryTokens } from '@/app/src/token-registry/server/registryFiles';

export const revalidate = 3_600;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chainId = searchParams.get('chainId');
  const tokenList = await searchRegistryTokens({
    query: searchParams.get('q') ?? '',
    chainId: chainId ? Number(chainId) : undefined,
  });

  return NextResponse.json(tokenList, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
