import { NextRequest, NextResponse } from 'next/server';

import { CategoryRouter } from '../../../../CategoryRouter';
import {
  ValidationError,
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
    const status = error instanceof ValidationError ? error.status : 500;
    const code = error instanceof ValidationError ? error.code : 'AVAILABLE_ACTIONS_FETCH_ERROR';
    const message = error instanceof Error ? error.message : 'Failed to fetch available actions';
    return NextResponse.json({ error: { code, message } }, { status });
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
