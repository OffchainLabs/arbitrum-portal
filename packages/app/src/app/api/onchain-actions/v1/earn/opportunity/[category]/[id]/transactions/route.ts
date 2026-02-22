import { unstable_cache } from 'next/cache';
import { NextRequest } from 'next/server';

import { CategoryRouter } from '@/earn-api/CategoryRouter';
import {
  assertCorsOriginAllowed,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '@/earn-api/lib/http';
import {
  assertAddress,
  parseEarnNetwork,
  parseOpportunityCategory,
} from '@/earn-api/lib/validation';
import { TransactionHistoryResponse } from '@/earn-api/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string; id: string } },
) {
  try {
    assertCorsOriginAllowed(request);

    const searchParams = request.nextUrl.searchParams;
    const category = parseOpportunityCategory(params.category);
    const network = parseEarnNetwork(searchParams.get('network'));
    const opportunityId = assertAddress(params.id, 'opportunityId');
    const userAddress = assertAddress(searchParams.get('userAddress'), 'userAddress');

    const router = new CategoryRouter();
    const adapter = router.routeToAdapter(category);

    // Rate limiting: use very short server cache (30s) to prevent abuse
    // Client-side caching is handled by SWR in-memory cache
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
      vendor: adapter.vendor,
      userAddress,
      transactions,
      total: transactions.length,
    };

    // No long-term browser caching headers - server and SWR handle cache lifecycle
    return jsonResponse(request, response, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate', // No caching, rate limiting handled by unstable_cache
      },
    });
  } catch (error) {
    return errorResponse(request, error, {
      code: 'TRANSACTION_HISTORY_FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch transaction history',
    });
  }
}

export function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}
