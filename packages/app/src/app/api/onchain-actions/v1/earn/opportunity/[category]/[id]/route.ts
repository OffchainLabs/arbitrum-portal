import { NextRequest } from 'next/server';

import { CategoryRouter } from '@/earn-api/CategoryRouter';
import { errorResponse, jsonResponse, optionsResponse } from '@/earn-api/lib/http';
import {
  assertAddress,
  parseEarnChainId,
  parseOpportunityCategory,
} from '@/earn-api/lib/validation';
import { getEarnNetworkFromChainId } from '@/earn-api/types';

export const revalidate = 3600;

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string; id: string } },
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = parseOpportunityCategory(params.category);
    const chainId = parseEarnChainId(searchParams.get('chainId'));
    const network = getEarnNetworkFromChainId(chainId);
    const opportunityId = assertAddress(params.id, 'opportunityId');

    const router = new CategoryRouter();
    const adapter = router.routeToAdapter(category);
    const opportunity = await adapter.getOpportunityDetails(opportunityId, network);

    return jsonResponse(opportunity, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching opportunity details:', error);
    return errorResponse(error, {
      code: 'OPPORTUNITY_DETAILS_FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch opportunity details',
    });
  }
}
