import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { getHeldTokens } from '@/app/src/token-registry/server/registryFiles';

// Balances are per wallet and change with every transfer, so nothing caches them. The token lists
// stay in their own cached endpoints, shared by every user.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  return NextResponse.json(await getHeldTokens(address), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
