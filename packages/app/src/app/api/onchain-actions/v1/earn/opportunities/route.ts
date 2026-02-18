import { NextRequest, NextResponse } from 'next/server';

import { OPPORTUNITY_CATEGORIES, type OpportunityCategory } from '@/app-types/earn/vaults';

import { CategoryRouter } from '../CategoryRouter';
import { OpportunityFilters, StandardOpportunity } from '../types';

const MAX_PER_PAGE = 100;
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600' };

export const revalidate = 3600;

function parsePositiveInt(value: string | null, defaultVal: number, max?: number): number {
  if (value === null) return defaultVal;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0 || !Number.isInteger(parsed)) return defaultVal;
  return max !== undefined ? Math.min(parsed, max) : parsed;
}

function parseNonNegativeNumber(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) || parsed < 0 ? undefined : parsed;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryParam = searchParams.get('category');
    const category = categoryParam as OpportunityCategory | null;
    const orderBy = (searchParams.get('orderBy') as 'rawApy' | 'rawTvl' | undefined) ?? 'rawApy';

    const rawPerPage = searchParams.get('perPage');
    const perPage = parsePositiveInt(rawPerPage, 50, MAX_PER_PAGE);
    const rawPage = searchParams.get('page');
    const page = parsePositiveInt(rawPage, 0);

    const minTvl = parseNonNegativeNumber(searchParams.get('minTvl'));
    const minApy = parseNonNegativeNumber(searchParams.get('minApy'));

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
