import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { PRICE_REQUEST_LIMIT, getTokenPrices } from '@/app/src/token-registry/server/prices';

// tokens: comma-separated chainId:address pairs. The page asks for the selected tokens and the
// native tokens of their chains. The balances endpoint gives the prices of the held tokens.
export async function GET(request: NextRequest) {
  const tokens = (request.nextUrl.searchParams.get('tokens') ?? '')
    .split(',')
    .filter(Boolean)
    .map((key) => {
      const [chainId, address] = key.split(':');
      return { chainId: Number(chainId), address: (address ?? '').toLowerCase() };
    });
  if (
    tokens.length > PRICE_REQUEST_LIMIT ||
    tokens.some(({ chainId, address }) => Number.isNaN(chainId) || !isAddress(address))
  ) {
    return NextResponse.json({ error: 'Invalid tokens' }, { status: 400 });
  }

  return NextResponse.json(await getTokenPrices(tokens), {
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' },
  });
}
