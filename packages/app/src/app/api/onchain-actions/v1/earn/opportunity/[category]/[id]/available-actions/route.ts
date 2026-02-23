import { unstable_cache } from 'next/cache';
import { NextRequest } from 'next/server';

import { CategoryRouter } from '../../../../CategoryRouter';
import { errorResponse, jsonResponse, optionsResponse } from '../../../../lib/http';
import {
  assertAddress,
  parseEarnChainId,
  parseOpportunityCategory,
} from '../../../../lib/validation';
import { AvailableActions, getEarnNetworkFromChainId } from '../../../../types';

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string; id: string } },
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = parseOpportunityCategory(params.category);
    const userAddress = assertAddress(searchParams.get('userAddress'), 'userAddress');
    const chainId = parseEarnChainId(searchParams.get('chainId'));
    const network = getEarnNetworkFromChainId(chainId);
    const opportunityId = assertAddress(params.id, 'opportunityId');

    const cacheKey = `available-actions:${category}:${chainId}:${opportunityId}:${userAddress}`;

    const getCachedAvailableActions = unstable_cache(
      async () => {
        const router = new CategoryRouter();
        const adapter = router.routeToAdapter(category);
        const actions = await adapter.getAvailableActions(opportunityId, userAddress, network);

        return actions;
      },
      [cacheKey],
      {
        revalidate: 300, // 5 minutes (available actions context changes with user state)
        tags: ['available-actions', cacheKey],
      },
    );

    const availableActions: AvailableActions = await getCachedAvailableActions();

    return jsonResponse(availableActions, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error fetching available actions:', error);
    return errorResponse(error, {
      code: 'AVAILABLE_ACTIONS_FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch available actions',
    });
  }
}

export function OPTIONS() {
  return optionsResponse();
}
