import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { CategoryRouter } from '@/earn-api/CategoryRouter';
import { EARN_CACHE_SECONDS, earnCacheTags } from '@/earn-api/lib/cache';
import { enforceEarnRateLimit } from '@/earn-api/lib/rateLimit';
import {
  assertAddress,
  parseEarnChainId,
  parseOpportunityCategory,
} from '@/earn-api/lib/validation';
import { TransactionHistoryResponse } from '@/earn-api/types';

const router = new CategoryRouter();

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string; id: string } },
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = parseOpportunityCategory(params.category);
    const chainId = parseEarnChainId(searchParams.get('chainId'));
    const opportunityId = assertAddress(params.id, 'opportunityId');
    const userAddress = assertAddress(searchParams.get('userAddress'), 'userAddress');

    const rateLimited = await enforceEarnRateLimit(request, { key: userAddress });
    if (rateLimited) return rateLimited;

    const adapter = router.routeToAdapter(category);

    const cacheKey = `transactions:${category}:${chainId}:${opportunityId}:${userAddress}`;

    const getCachedTransactions = unstable_cache(
      async () => {
        const transactions = await adapter.getUserTransactions(opportunityId, userAddress, chainId);
        return transactions;
      },
      [cacheKey],
      {
        revalidate: EARN_CACHE_SECONDS.transactions,
        tags: earnCacheTags.transactions(userAddress),
      },
    );

    const transactions = await getCachedTransactions();

    const response: TransactionHistoryResponse = {
      opportunityId,
      category,
      vendor: adapter.vendor,
      userAddress,
      transactions,
      total: transactions.length,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    const routeError = error as { message?: string; code?: string; status?: number };
    return NextResponse.json(
      {
        message: routeError.message ?? 'Failed to fetch transaction history',
        code: routeError.code ?? 'TRANSACTION_HISTORY_FETCH_ERROR',
      },
      { status: routeError.status ?? 500 },
    );
  }
}
