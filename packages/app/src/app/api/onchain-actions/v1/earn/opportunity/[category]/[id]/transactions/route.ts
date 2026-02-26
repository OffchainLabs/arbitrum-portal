import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { CategoryRouter } from '@/earn-api/CategoryRouter';
import { errorResponse } from '@/earn-api/lib/responses';
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

    const adapter = router.routeToAdapter(category);

    const rateLimitKey = `transactions-rl:${category}:${chainId}:${opportunityId}:${userAddress}`;

    const getRateLimitedTransactions = unstable_cache(
      async () => {
        const transactions = await adapter.getUserTransactions(opportunityId, userAddress, chainId);
        return transactions;
      },
      [rateLimitKey],
      {
        revalidate: 30, // 30 seconds - rate limiting only
        tags: ['transactions-rl', rateLimitKey],
      },
    );

    const transactions = await getRateLimitedTransactions();

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
    return errorResponse(error, {
      code: 'TRANSACTION_HISTORY_FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch transaction history',
    });
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
