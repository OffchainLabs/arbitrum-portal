import { unstable_noStore as noStore, unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { CategoryRouter } from '../CategoryRouter';
import { requireEarnApiKey } from '../lib/apiKeyAuth';
import { EARN_CACHE_SECONDS, earnCacheTags } from '../lib/cache';
import { enforceEarnRateLimit } from '../lib/rateLimit';
import {
  ValidationError,
  parseOptionalChainIdForCategory,
  parseOptionalNumber,
  parseOptionalOpportunityCategory,
} from '../lib/validation';
import { OpportunityFilters, StandardOpportunity } from '../types';

const MAX_RESULTS = 50;
const CACHE_HEADERS = {
  'Cache-Control': `public, s-maxage=${EARN_CACHE_SECONDS.opportunities}, stale-while-revalidate=${EARN_CACHE_SECONDS.opportunities}`,
};
const router = new CategoryRouter();

export async function GET(request: NextRequest) {
  noStore();
  try {
    const auth = requireEarnApiKey(request);
    if (auth instanceof NextResponse) return auth;

    const rateLimited = await enforceEarnRateLimit(request, { key: auth.key });
    if (rateLimited) return rateLimited;

    const searchParams = request.nextUrl.searchParams;
    const category = parseOptionalOpportunityCategory(searchParams.get('category'));
    const orderByParam = searchParams.get('orderBy');
    const orderBy: 'rawApy' | 'rawTvl' = orderByParam === 'rawTvl' ? 'rawTvl' : 'rawApy';
    if (orderByParam && orderByParam !== 'rawApy' && orderByParam !== 'rawTvl') {
      throw new ValidationError('INVALID_ORDER_BY', 'orderBy must be one of: rawApy, rawTvl');
    }

    const minTvl = parseOptionalNumber(searchParams.get('minTvl'), {
      field: 'minTvl',
      code: 'INVALID_MIN_TVL',
      min: 0,
    });
    const minApy = parseOptionalNumber(searchParams.get('minApy'), {
      field: 'minApy',
      code: 'INVALID_MIN_APY',
      min: 0,
    });

    const filters: OpportunityFilters = {
      chainId: parseOptionalChainIdForCategory(searchParams.get('chainId'), category),
      minTvl,
      minApy,
      perPage: MAX_RESULTS,
    };

    // keyParts must encode every closure-captured input; missed fields cause cross-request collisions.
    const getCachedOpportunities = unstable_cache(
      async () => {
        let opportunities: StandardOpportunity[] = [];

        if (category) {
          const adapter = router.routeToAdapter(category);
          opportunities = await adapter.getOpportunities(filters);
        } else {
          const adapters = router.getAllAdapters();
          const results = await Promise.allSettled(
            adapters.map((adapter) => adapter.getOpportunities(filters)),
          );
          for (const result of results) {
            if (result.status === 'fulfilled') opportunities.push(...result.value);
          }
        }

        const sortKey = orderBy === 'rawTvl' ? 'rawTvl' : 'rawApy';
        opportunities.sort((a, b) => (b.metrics[sortKey] ?? 0) - (a.metrics[sortKey] ?? 0));

        const capped = opportunities.slice(0, MAX_RESULTS);

        return {
          opportunities: capped,
          total: opportunities.length,
          vendors: Array.from(new Set(capped.map((o) => o.vendor))),
          categories: Array.from(new Set(capped.map((o) => o.category))),
        };
      },
      [
        `earn:opportunities:${category ?? 'all'}:${filters.chainId ?? 'all'}:${minTvl ?? 'all'}:${minApy ?? 'all'}:${orderBy}`,
      ],
      {
        revalidate: EARN_CACHE_SECONDS.opportunities,
        tags: earnCacheTags.opportunities(),
      },
    );

    const result = await getCachedOpportunities();
    return NextResponse.json(result, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    const routeError = error as { message?: string; code?: string; status?: number };
    return NextResponse.json(
      {
        message: routeError.message ?? 'Failed to fetch opportunities',
        code: routeError.code ?? 'OPPORTUNITIES_FETCH_ERROR',
      },
      { status: routeError.status ?? 500 },
    );
  }
}
