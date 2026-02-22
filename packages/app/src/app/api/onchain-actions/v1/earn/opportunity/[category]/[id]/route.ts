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

export const revalidate = 3600;

export function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

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

    const router = new CategoryRouter();
    const adapter = router.routeToAdapter(category);
    const opportunity = await adapter.getOpportunityDetails(opportunityId, network);

    return jsonResponse(request, opportunity, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching opportunity details:', error);
    return errorResponse(request, error, {
      code: 'OPPORTUNITY_DETAILS_FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch opportunity details',
    });
  }
}
