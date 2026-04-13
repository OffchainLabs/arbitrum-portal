// Pendle API base URL
export const PENDLE_API_BASE_URL = 'https://api-v2.pendle.finance/core';

export type PendleMarketCategory = 'eth' | 'btc' | 'stables';

export const PENDLE_MARKET_CATEGORIES: PendleMarketCategory[] = ['eth', 'btc', 'stables'];

export const PENDLE_MIN_TVL_USD = 1_000_000;

export function extractAddressFromTokenId(tokenId: string): string {
  const parts = tokenId.split('-');
  return parts[parts.length - 1] || tokenId;
}
