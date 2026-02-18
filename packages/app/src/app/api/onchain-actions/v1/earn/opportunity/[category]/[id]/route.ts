import { NextRequest, NextResponse } from 'next/server';

import { CategoryRouter } from '@/earn-api/CategoryRouter';
import { OPPORTUNITY_CATEGORIES, OpportunityCategory, StandardOpportunity } from '@/earn-api/types';

// Enable route-level caching with 1 hour revalidation
export const revalidate = 3600;

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string; id: string } },
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = params.category as OpportunityCategory;
    const network = searchParams.get('network') || 'arbitrum';
    const opportunityId = params.id;

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

    const router = new CategoryRouter();
    const adapter = router.routeToAdapter(category);
    const opportunity: StandardOpportunity = await adapter.getOpportunityDetails(
      opportunityId,
      network,
    );

    return NextResponse.json(opportunity, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching opportunity details:', error);
    return NextResponse.json(
      {
        error: {
          code: 'OPPORTUNITY_DETAILS_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch opportunity details',
        },
      },
      { status: 500 },
    );
  }
}
