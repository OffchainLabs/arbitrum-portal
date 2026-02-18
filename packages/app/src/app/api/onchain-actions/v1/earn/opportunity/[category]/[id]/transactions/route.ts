import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { CategoryRouter } from '@/earn-api/CategoryRouter';
import {
  OPPORTUNITY_CATEGORIES,
  OpportunityCategory,
  TransactionHistoryResponse,
} from '@/earn-api/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string; id: string } },
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = params.category as OpportunityCategory;
    const network = searchParams.get('network') || 'arbitrum';
    const opportunityId = params.id;
    const userAddress = searchParams.get('userAddress');

    if (!OPPORTUNITY_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_CATEGORY',
            message: `Invalid category: ${category}. Must be one of: ${OPPORTUNITY_CATEGORIES.join(', ')}`,
          },
        },
        { status: 400 },
      );
    }

    // Validate userAddress
    if (!userAddress) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_USER_ADDRESS',
            message: 'userAddress query parameter is required',
          },
        },
        { status: 400 },
      );
    }

    const router = new CategoryRouter();
    const adapter = router.routeToAdapter(category);

    // Rate limiting: Use very short cache (30s) to prevent abuse
    // Actual caching happens in frontend localStorage (12-24 hours)
    const rateLimitKey = `transactions-rl:${category}:${network}:${opportunityId}:${userAddress}`;

    const getRateLimitedTransactions = unstable_cache(
      async () => {
        const transactions = await adapter.getUserTransactions(opportunityId, userAddress, network);
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
      vendor: router.routeToAdapter(category).vendor,
      userAddress,
      transactions,
      total: transactions.length,
    };

    // No long-term caching headers - frontend handles caching via localStorage
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate', // No caching, rate limiting handled by unstable_cache
      },
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return NextResponse.json(
      {
        error: {
          code: 'TRANSACTION_HISTORY_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch transaction history',
        },
      },
      { status: 500 },
    );
  }
}
