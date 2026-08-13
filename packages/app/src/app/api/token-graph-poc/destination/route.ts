import { NextRequest, NextResponse } from 'next/server';

import { getChainById, getRouteCandidates } from '@/app-lib/token-graph-poc/graph';

function parseChainId(value: string | null) {
  if (!value) {
    return null;
  }

  const chainId = Number(value);
  return Number.isInteger(chainId) && chainId > 0 ? chainId : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const destinationChainId = parseChainId(searchParams.get('destinationChainId'));
  const sourceTokenId = searchParams.get('token');
  const q = searchParams.get('q') ?? '';

  if (destinationChainId === null || !sourceTokenId) {
    return NextResponse.json(
      { error: 'destinationChainId and token are required' },
      { status: 400 },
    );
  }

  if (!getChainById(destinationChainId)) {
    return NextResponse.json({ error: 'Unsupported chain id' }, { status: 400 });
  }

  return NextResponse.json(
    await getRouteCandidates({
      sourceTokenId,
      destinationChainId,
      q,
    }),
  );
}
