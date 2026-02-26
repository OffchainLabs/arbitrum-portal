import { NextRequest, NextResponse } from 'next/server';

import { CategoryRouter } from '../../../../CategoryRouter';
import {
  assertAddress,
  parseEarnChainId,
  parseOpportunityCategory,
} from '../../../../lib/validation';
import { AvailableActions } from '../../../../types';

const router = new CategoryRouter();

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string; id: string } },
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = parseOpportunityCategory(params.category);
    const userAddress = assertAddress(searchParams.get('userAddress'), 'userAddress');
    const chainId = parseEarnChainId(searchParams.get('chainId'));
    const opportunityId = assertAddress(params.id, 'opportunityId');

    const adapter = router.routeToAdapter(category);
    const availableActions: AvailableActions = await adapter.getAvailableActions(
      opportunityId,
      userAddress,
      chainId,
    );

    return NextResponse.json(availableActions, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error fetching available actions:', error);
    const routeError = error as { message?: string; code?: string; status?: number };
    return NextResponse.json(
      {
        message: routeError.message ?? 'Failed to fetch available actions',
        code: routeError.code ?? 'AVAILABLE_ACTIONS_FETCH_ERROR',
      },
      { status: routeError.status ?? 500 },
    );
  }
}
