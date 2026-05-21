import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { CategoryRouter } from '@/earn-api/CategoryRouter';
import { EARN_CACHE_SECONDS, earnCacheTags } from '@/earn-api/lib/cache';
import { enforceEarnRateLimit } from '@/earn-api/lib/rateLimit';
import {
  assertAddress,
  parseEarnChainId,
  parseOpportunityCategory,
} from '@/earn-api/lib/validation';

const router = new CategoryRouter();

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string; id: string } },
) {
  try {
    const rateLimited = await enforceEarnRateLimit(request);
    if (rateLimited) return rateLimited;

    const searchParams = request.nextUrl.searchParams;
    const category = parseOpportunityCategory(params.category);
    const chainId = parseEarnChainId(searchParams.get('chainId'));
    const opportunityId = assertAddress(params.id, 'opportunityId');

    const adapter = router.routeToAdapter(category);
    const getCachedOpportunity = unstable_cache(
      () => adapter.getOpportunityDetails(opportunityId, chainId),
      [`earn:opportunity:${category}:${chainId}:${opportunityId.toLowerCase()}`],
      {
        revalidate: EARN_CACHE_SECONDS.opportunities,
        tags: earnCacheTags.opportunity(opportunityId),
      },
    );
    const opportunity = await getCachedOpportunity();

    return NextResponse.json(opportunity, {
      headers: {
        'Cache-Control': `public, s-maxage=${EARN_CACHE_SECONDS.opportunities}, stale-while-revalidate=${EARN_CACHE_SECONDS.opportunities}`,
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
