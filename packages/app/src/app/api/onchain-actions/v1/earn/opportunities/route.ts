import { NextRequest } from 'next/server';

import { parseValidQueryNumber } from '@/app-lib/parseValidQueryNumber';

import { CategoryRouter } from '../CategoryRouter';
import { assertCorsOriginAllowed, errorResponse, jsonResponse, optionsResponse } from '../lib/http';
import {
  ValidationError,
  parseEarnNetwork,
  parseOptionalNumber,
  parseOptionalOpportunityCategory,
} from '../lib/validation';
import { OpportunityFilters, StandardOpportunity } from '../types';

const MIN_PER_PAGE = 1;
const MAX_PER_PAGE = 50;
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600' };

export const revalidate = 3600;

export function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    assertCorsOriginAllowed(request);

    const searchParams = request.nextUrl.searchParams;
    const category = parseOptionalOpportunityCategory(searchParams.get('category'));
    const orderByParam = searchParams.get('orderBy');
    const orderBy: 'rawApy' | 'rawTvl' = orderByParam === 'rawTvl' ? 'rawTvl' : 'rawApy';
    if (orderByParam && orderByParam !== 'rawApy' && orderByParam !== 'rawTvl') {
      throw new ValidationError('INVALID_ORDER_BY', 'orderBy must be one of: rawApy, rawTvl');
    }

    const perPageRaw = searchParams.get('perPage');
    const parsedPerPage = parseValidQueryNumber(perPageRaw, {
      default: 50,
      min: MIN_PER_PAGE,
      max: MAX_PER_PAGE,
      integer: true,
    });
    if (perPageRaw !== null && parsedPerPage === undefined) {
      throw new ValidationError(
        'INVALID_PER_PAGE',
        `perPage must be an integer between ${MIN_PER_PAGE} and ${MAX_PER_PAGE}`,
      );
    }
    const perPage = parsedPerPage ?? 50;

    const pageRaw = searchParams.get('page');
    const parsedPage = parseValidQueryNumber(pageRaw, { default: 0, min: 0, integer: true });
    if (pageRaw !== null && parsedPage === undefined) {
      throw new ValidationError('INVALID_PAGE', 'page must be an integer >= 0');
    }
    const page = parsedPage ?? 0;

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
      network: parseEarnNetwork(searchParams.get('network')),
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

    return jsonResponse(request, result, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return errorResponse(request, error, {
      code: 'OPPORTUNITIES_FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch opportunities',
    });
  }
}
