import { NextRequest } from 'next/server';

import { CategoryRouter } from '../CategoryRouter';
import { errorResponse, jsonResponse, optionsResponse } from '../lib/http';
import {
  ValidationError,
  parseEarnChainId,
  parseOptionalNumber,
  parseOptionalOpportunityCategory,
} from '../lib/validation';
import { OpportunityFilters, StandardOpportunity } from '../types';

const MIN_PER_PAGE = 1;
const MAX_PER_PAGE = 50;
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600' };

export const revalidate = 3600;

export function OPTIONS() {
  return optionsResponse();
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

    const perPage =
      parseOptionalNumber(searchParams.get('perPage'), {
        field: 'perPage',
        code: 'INVALID_PER_PAGE',
        min: MIN_PER_PAGE,
        max: MAX_PER_PAGE,
        integer: true,
      }) ?? 50;

    const page =
      parseOptionalNumber(searchParams.get('page'), {
        field: 'page',
        code: 'INVALID_PAGE',
        min: 0,
        integer: true,
      }) ?? 0;

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
      chainId: parseEarnChainId(searchParams.get('chainId')),
      minTvl,
      minApy,
      perPage,
      page,
    };

    const router = new CategoryRouter();
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

    const start = page * perPage;
    const paginated = opportunities.slice(start, start + perPage);

    const result = {
      opportunities: paginated,
      pagination: { page, perPage, total: opportunities.length },
      vendors: Array.from(new Set(opportunities.map((o) => o.vendor))),
      categories: Array.from(new Set(opportunities.map((o) => o.category))),
    };

    return jsonResponse(result, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return errorResponse(error, {
      code: 'OPPORTUNITIES_FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch opportunities',
    });
  }
}
