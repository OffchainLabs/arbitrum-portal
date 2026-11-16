import { NextRequest, NextResponse } from 'next/server';

import { getSelection } from '@/app/src/token-registry/server/registryFiles';
import { NATIVE_TOKEN_ADDRESS } from '@/app/src/token-registry/types';

export const revalidate = 3_600;

// The page decodes the URL's chain slugs to ids before it calls this. Without a source token, the
// native token of the source chain, like the bridge's token query parameter.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const destinationChainId = searchParams.get('destinationChainId');
  const selection = await getSelection({
    sourceChainId: Number(searchParams.get('sourceChainId')),
    sourceTokenAddress: (searchParams.get('sourceToken') ?? NATIVE_TOKEN_ADDRESS).toLowerCase(),
    destinationChainId: destinationChainId ? Number(destinationChainId) : undefined,
    destinationTokenAddress: searchParams.get('destinationToken')?.toLowerCase(),
  });

  return NextResponse.json(selection, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
