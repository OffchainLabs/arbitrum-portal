import { NextRequest, NextResponse } from 'next/server';

import { parseValidQueryNumber } from '@/app-lib/parseValidQueryNumber';
import { OPPORTUNITY_CATEGORIES, type OpportunityCategory } from '@/app-types/earn/vaults';

import { CategoryRouter } from '../CategoryRouter';
import { OpportunityFilters, StandardOpportunity } from '../types';

const MIN_PER_PAGE = 1;
const MAX_PER_PAGE = 50;
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600' };

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryParam = searchParams.get('category');
    const category = categoryParam as OpportunityCategory | null;
    const orderBy = (searchParams.get('orderBy') as 'rawApy' | 'rawTvl' | undefined) ?? 'rawApy';

    const perPage =
      parseValidQueryNumber(searchParams.get('perPage'), {
        default: 50,
        min: MIN_PER_PAGE,
        max: MAX_PER_PAGE,
        integer: true,
      }) ?? 50;
    const page =
      parseValidQueryNumber(searchParams.get('page'), { default: 0, min: 0, integer: true }) ?? 0;
    const minTvl = parseValidQueryNumber(searchParams.get('minTvl'), { min: 0 });
    const minApy = parseValidQueryNumber(searchParams.get('minApy'), { min: 0 });

    const filters: OpportunityFilters = {
      network: searchParams.get('network') || 'arbitrum',
      minTvl,
      minApy,
      perPage,
      page,
    };

    const router = new CategoryRouter();
    let opportunities: StandardOpportunity[] = [];

    if (category) {
      if (!OPPORTUNITY_CATEGORIES.includes(category)) {
        return NextResponse.json(
          {
            opportunities: [],
            pagination: { page, perPage, total: 0 },
            vendors: [],
            categories: [],
          },
          { headers: CACHE_HEADERS },
        );
      }
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

    const start = page * perPage;
    const paginated = opportunities.slice(start, start + perPage);

    const result = {
      opportunities: paginated,
      pagination: { page, perPage, total: opportunities.length },
      vendors: Array.from(new Set(opportunities.map((o) => o.vendor))),
      categories: Array.from(new Set(opportunities.map((o) => o.category))),
    };

    return NextResponse.json(result, { headers: CACHE_HEADERS });
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
