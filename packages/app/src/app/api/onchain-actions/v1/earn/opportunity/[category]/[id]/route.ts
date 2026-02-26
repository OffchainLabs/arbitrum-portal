import { NextRequest, NextResponse } from 'next/server';

import { CategoryRouter } from '@/earn-api/CategoryRouter';
import {
  assertAddress,
  parseEarnChainId,
  parseOpportunityCategory,
} from '@/earn-api/lib/validation';

const router = new CategoryRouter();

export const revalidate = 3600;

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string; id: string } },
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = parseOpportunityCategory(params.category);
    const chainId = parseEarnChainId(searchParams.get('chainId'));
    const opportunityId = assertAddress(params.id, 'opportunityId');

    const adapter = router.routeToAdapter(category);
    const opportunity = await adapter.getOpportunityDetails(opportunityId, chainId);

    return NextResponse.json(opportunity, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching opportunity details:', error);
    const routeError = error as { message?: string; code?: string; status?: number };
    return NextResponse.json(
      {
        message: routeError.message ?? 'Failed to fetch opportunity details',
        code: routeError.code ?? 'OPPORTUNITY_DETAILS_FETCH_ERROR',
      },
      { status: routeError.status ?? 500 },
    );
  }
}
