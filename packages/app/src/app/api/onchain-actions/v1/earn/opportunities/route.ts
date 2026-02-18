import { NextRequest, NextResponse } from 'next/server';

import { CategoryRouter } from '../CategoryRouter';
import {
  OPPORTUNITY_CATEGORIES,
  OpportunityCategory,
  OpportunityFilters,
  StandardOpportunity,
} from '../types';

// Enable route-level caching with 1 hour revalidation
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const categoryParam = searchParams.get('category');
    const category = categoryParam as OpportunityCategory | null;
    const filters: OpportunityFilters = {
      network: searchParams.get('network') || 'arbitrum',
      minTvl: searchParams.get('minTvl') ? Number(searchParams.get('minTvl')) : undefined,
      minApy: searchParams.get('minApy') ? Number(searchParams.get('minApy')) : undefined,
      perPage: searchParams.get('perPage') ? Number(searchParams.get('perPage')) : 50,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 0,
    };

    const router = new CategoryRouter();

    let opportunities: StandardOpportunity[] = [];

    if (category) {
      if (!OPPORTUNITY_CATEGORIES.includes(category)) {
        return NextResponse.json(
          {
            opportunities: [],
            pagination: { page: filters.page!, perPage: filters.perPage!, total: 0 },
            vendors: [],
            categories: [],
          },
          { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600' } },
        );
      }
      const adapter = router.routeToAdapter(category);
      opportunities = await adapter.getOpportunities(filters);
    } else {
      const adapters = router.getAllAdapters();
      // Use Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled(
        adapters.map((adapter) => adapter.getOpportunities(filters)),
      );
      // Collect successful results and log errors
      const successfulResults: StandardOpportunity[] = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulResults.push(...result.value);
        } else {
          const adapter = adapters[index];
          if (adapter) {
            console.error(
              `Failed to fetch opportunities from ${adapter.vendor} adapter:`,
              result.reason,
            );
          } else {
            console.error(
              `Failed to fetch opportunities from adapter at index ${index}:`,
              result.reason,
            );
          }
        }
      });
      opportunities = successfulResults;
    }

    opportunities.sort((a, b) => (b.metrics.rawApy ?? 0) - (a.metrics.rawApy ?? 0));

    const start = filters.page! * filters.perPage!;
    const end = start + filters.perPage!;
    const paginated = opportunities.slice(start, end);

    const result = {
      opportunities: paginated,
      pagination: {
        page: filters.page!,
        perPage: filters.perPage!,
        total: opportunities.length,
      },
      vendors: Array.from(new Set(opportunities.map((o) => o.vendor))),
      categories: Array.from(new Set(opportunities.map((o) => o.category))),
    };

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json(
      {
        error: {
          code: 'OPPORTUNITIES_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch opportunities',
        },
      },
      { status: 500 },
    );
  }
}
