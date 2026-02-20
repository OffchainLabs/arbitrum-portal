import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { CategoryRouter } from '../../../../CategoryRouter';
import { AvailableActions, OPPORTUNITY_CATEGORIES, OpportunityCategory } from '../../../../types';

/**
 * Get available actions - "What can I do?"
 * Returns available actions and vendor-specific context data.
 *
 * For Vaults (lend): Returns full transaction context including deposit/redeem steps,
 * claimable rewards, and other vault-specific transactional data.
 *
 * For other categories: Returns minimal context (just available actions).
 *
 * Fetched once when action panel loads.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { category: string; id: string } },
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = params.category as OpportunityCategory;
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

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_USER_ADDRESS',
            message: 'userAddress must be a valid Ethereum address',
          },
        },
        { status: 400 },
      );
    }

    const network = searchParams.get('network') || 'arbitrum';
    const opportunityId = params.id;

    const cacheKey = `available-actions:${category}:${network}:${opportunityId}:${userAddress}`;

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

    return NextResponse.json(availableActions, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error fetching available actions:', error);
    return NextResponse.json(
      {
        error: {
          code: 'AVAILABLE_ACTIONS_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch available actions',
        },
      },
      { status: 500 },
    );
  }
}
