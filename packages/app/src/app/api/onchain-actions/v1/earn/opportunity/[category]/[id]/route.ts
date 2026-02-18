import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { OPPORTUNITY_CATEGORIES, type OpportunityCategory } from '@/app-types/earn/vaults';
import { CategoryRouter } from '@/earn-api/CategoryRouter';

const ALLOWED_NETWORKS = ['arbitrum', 'mainnet'] as const;

export const revalidate = 3600;

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string; id: string } },
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = params.category as OpportunityCategory;
    const network = (searchParams.get('network') ||
      'arbitrum') as (typeof ALLOWED_NETWORKS)[number];
    const opportunityId = params.id;

    if (!ALLOWED_NETWORKS.includes(network)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_NETWORK',
            message: `network must be one of: ${ALLOWED_NETWORKS.join(', ')}`,
          },
        },
        { status: 400 },
      );
    }
    if (!opportunityId || !isAddress(opportunityId)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_OPPORTUNITY_ID',
            message: 'opportunity id must be a valid Ethereum address',
          },
        },
        { status: 400 },
      );
    }
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
    const opportunity = await adapter.getOpportunityDetails(opportunityId, network);

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
