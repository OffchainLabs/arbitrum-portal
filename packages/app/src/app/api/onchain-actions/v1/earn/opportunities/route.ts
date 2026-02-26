import { NextRequest, NextResponse } from 'next/server';

import { CategoryRouter } from '../CategoryRouter';
import { errorResponse } from '../lib/responses';
import {
  ValidationError,
  parseOptionalEarnChainId,
  parseOptionalNumber,
  parseOptionalOpportunityCategory,
} from '../lib/validation';
import { OpportunityFilters, StandardOpportunity } from '../types';

const MAX_RESULTS = 50;
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600' };
const router = new CategoryRouter();

export const revalidate = 3600;

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(request: NextRequest) {
  try {
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
      chainId: parseOptionalEarnChainId(searchParams.get('chainId')),
      minTvl,
      minApy,
      perPage: MAX_RESULTS,
    };

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

    const result = {
      opportunities: capped,
      total: opportunities.length,
      vendors: Array.from(new Set(capped.map((o) => o.vendor))),
      categories: Array.from(new Set(capped.map((o) => o.category))),
    };

    return NextResponse.json(result, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return errorResponse(error, {
      code: 'OPPORTUNITIES_FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch opportunities',
    });
  }
}
