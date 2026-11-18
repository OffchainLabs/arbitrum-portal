import { NextResponse } from 'next/server';

import { getLifiTokenRegistry } from '@/app/src/app/api/crosschain-transfers/lifi/tokens/registry';

export async function GET() {
  const { tokensByChain } = await getLifiTokenRegistry();
  const prices: Record<string, number> = {};
  for (const tokens of Object.values(tokensByChain)) {
    for (const token of tokens) {
      const price = Number(token.priceUSD);
      if (Number.isFinite(price) && price > 0)
        prices[`${token.chainId}:${token.address.toLowerCase()}`] = price;
    }
  }
  return NextResponse.json(prices, {
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30' },
  });
}
