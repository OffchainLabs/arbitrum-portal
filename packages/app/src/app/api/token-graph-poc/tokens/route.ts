import { NextRequest, NextResponse } from 'next/server';

import { getChainById, searchTokens } from '@/app-lib/token-graph-poc/graph';

function parseChainId(value: string | null) {
  if (!value) {
    return null;
  }

  const chainId = Number(value);
  return Number.isInteger(chainId) && chainId > 0 ? chainId : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const chainId = parseChainId(searchParams.get('chainId'));
  const destinationChainId = parseChainId(searchParams.get('destinationChainId'));
  const q = searchParams.get('q') ?? '';
  const tokenId = searchParams.get('tokenId') ?? undefined;

  if (chainId === null) {
    return NextResponse.json({ error: 'chainId is required' }, { status: 400 });
  }

  if (!getChainById(chainId)) {
    return NextResponse.json({ error: 'Unsupported chain id' }, { status: 400 });
  }

  if (destinationChainId !== null && !getChainById(destinationChainId)) {
    return NextResponse.json({ error: 'Unsupported destination chain id' }, { status: 400 });
  }

  return NextResponse.json(
    await searchTokens({
      chainId,
      q,
      tokenId,
      destinationChainId: destinationChainId ?? undefined,
    }),
  );
}
