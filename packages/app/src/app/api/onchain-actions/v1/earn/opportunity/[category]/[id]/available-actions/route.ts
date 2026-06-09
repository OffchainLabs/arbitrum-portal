import { NextRequest, NextResponse } from 'next/server';

import { CategoryRouter } from '../../../../CategoryRouter';
import { requireEarnApiKey } from '../../../../lib/apiKeyAuth';
import { enforceEarnRateLimit } from '../../../../lib/rateLimit';
import {
  assertAddress,
  parseChainIdForCategory,
  parseOpportunityCategory,
} from '../../../../lib/validation';
import { AvailableActions } from '../../../../types';

const router = new CategoryRouter();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string; id: string }> },
) {
  try {
    const auth = requireEarnApiKey(request);
    if (auth instanceof NextResponse) return auth;

    const searchParams = request.nextUrl.searchParams;
    const { category: rawCategory, id } = await params;
    const category = parseOpportunityCategory(rawCategory);
    const userAddress = assertAddress(searchParams.get('userAddress'), 'userAddress');
    const chainId = parseChainIdForCategory(searchParams.get('chainId'), category);
    const opportunityId = assertAddress(id, 'opportunityId');

    const rateLimited = await enforceEarnRateLimit(request, { key: userAddress });
    if (rateLimited) return rateLimited;

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
