import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { CategoryRouter } from '@/earn-api/CategoryRouter';
import { EARN_CACHE_SECONDS, earnCacheTags } from '@/earn-api/lib/cache';
import {
  alignTimestampToGranularity,
  buildWindowFromRange,
  deriveGranularityFromWindow,
  deriveRangeFromWindow,
} from '@/earn-api/lib/historicalWindow';
import { enforceEarnRateLimit } from '@/earn-api/lib/rateLimit';
import {
  ValidationError,
  assertAddress,
  parseEarnChainId,
  parseHistoricalRange,
  parseOpportunityCategory,
  parseOptionalAssetSymbol,
  parseOptionalTimestamp,
} from '@/earn-api/lib/validation';
import {
  type HistoricalData,
  type HistoricalGranularity,
  type HistoricalTimeRange,
} from '@/earn-api/types';

function resolveWindow(
  range: HistoricalTimeRange,
  fromParam?: number,
  toParam?: number,
): {
  fromTimestamp: number;
  toTimestamp: number;
  granularity: HistoricalGranularity;
  resolvedRange: HistoricalTimeRange;
} {
  if (fromParam === undefined && toParam === undefined) {
    return { ...buildWindowFromRange({ range }), resolvedRange: range };
  }
  if (fromParam === undefined || toParam === undefined) {
    throw new ValidationError(
      'INVALID_DATE_RANGE',
      'Both from and to must be provided when using explicit date range',
    );
  }
  if (fromParam >= toParam) {
    throw new ValidationError('INVALID_DATE_RANGE', 'from must be before to');
  }

  const granularity = deriveGranularityFromWindow(fromParam, toParam);
  const fromTimestamp = alignTimestampToGranularity(fromParam, granularity);
  const toTimestamp = alignTimestampToGranularity(toParam, granularity);

  if (fromTimestamp >= toTimestamp) {
    throw new ValidationError(
      'INVALID_DATE_RANGE',
      'from/to must span at least one granularity bucket',
    );
  }

  return {
    fromTimestamp,
    toTimestamp,
    granularity,
    resolvedRange: deriveRangeFromWindow(fromTimestamp, toTimestamp),
  };
}

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
    const range = parseHistoricalRange(searchParams.get('range'));
    const assetSymbol = parseOptionalAssetSymbol(searchParams.get('assetSymbol'));
    const fromTimestampParam = parseOptionalTimestamp(searchParams.get('from'), 'from');
    const toTimestampParam = parseOptionalTimestamp(searchParams.get('to'), 'to');

    const { fromTimestamp, toTimestamp, granularity, resolvedRange } = resolveWindow(
      range,
      fromTimestampParam,
      toTimestampParam,
    );

    const cacheTtlSeconds =
      resolvedRange === '1d'
        ? EARN_CACHE_SECONDS.historical1d
        : EARN_CACHE_SECONDS.historicalDefault;

    const adapter = router.routeToAdapter(category);
    const getCachedHistoricalData = unstable_cache(
      () =>
        adapter.getHistoricalData(opportunityId, resolvedRange, chainId, {
          assetSymbol,
          fromTimestamp,
          toTimestamp,
          granularity,
          resolvedRange,
        }),
      [
        `earn:historical:${category}:${chainId}:${opportunityId.toLowerCase()}:${resolvedRange}:${fromTimestamp}:${toTimestamp}:${assetSymbol ?? 'default'}`,
      ],
      {
        revalidate: cacheTtlSeconds,
        tags: earnCacheTags.historicalOpportunity(opportunityId),
      },
    );
    const historicalData: HistoricalData = await getCachedHistoricalData();

    if (!historicalData) {
      throw new ValidationError('HISTORICAL_DATA_NOT_FOUND', 'No historical data found', 404);
    }

    return NextResponse.json(historicalData, {
      headers: {
        'Cache-Control': `public, s-maxage=${cacheTtlSeconds}, stale-while-revalidate=${cacheTtlSeconds}, max-age=${cacheTtlSeconds}`,
      },
    });
  } catch (error) {
    const routeError = error as { message?: string; code?: string; status?: number };
    console.error('Error fetching historical data:', {
      message: routeError.message,
      code: routeError.code,
      status: routeError.status,
      error,
    });
    return NextResponse.json(
      {
        message: routeError.message ?? 'Failed to fetch historical data',
        code: routeError.code ?? 'HISTORICAL_DATA_FETCH_ERROR',
      },
      { status: routeError.status ?? 500 },
    );
  }
}
