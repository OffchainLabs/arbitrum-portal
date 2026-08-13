import { NextRequest, NextResponse } from 'next/server';

import { isSupportedPair } from '@/app/src/token-registry/constants';
import { resolveImport } from '@/app/src/token-registry/server/resolveImport';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      sourceChainId: string;
      destinationChainId: string;
      address: string;
    }>;
  },
) {
  const { sourceChainId, destinationChainId, address } = await params;
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

  const resolution = await resolveImport(pair, address);

  if (!resolution) {
    return NextResponse.json(
      { error: 'Token is not transferable on this chain pair' },
      { status: 404 },
    );
  }

  return NextResponse.json(resolution);
}
