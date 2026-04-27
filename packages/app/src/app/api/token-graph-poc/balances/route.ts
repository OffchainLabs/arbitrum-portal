import { NextRequest, NextResponse } from 'next/server';

import { getBalances, getChainById } from '@/app-lib/token-graph-poc/graph';

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
  const walletAddress = searchParams.get('walletAddress');

  if (chainId === null || !walletAddress) {
    return NextResponse.json({ error: 'chainId and walletAddress are required' }, { status: 400 });
  }

  if (!getChainById(chainId)) {
    return NextResponse.json({ error: 'Unsupported chain id' }, { status: 400 });
  }

  if (destinationChainId !== null && !getChainById(destinationChainId)) {
    return NextResponse.json({ error: 'Unsupported destination chain id' }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await getBalances({
        chainId,
        walletAddress,
        destinationChainId: destinationChainId ?? undefined,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch balances',
      },
      { status: 400 },
    );
  }
}
