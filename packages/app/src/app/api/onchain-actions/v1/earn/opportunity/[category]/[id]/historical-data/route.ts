import { NextRequest, NextResponse } from 'next/server';

import { CategoryRouter } from '@/earn-api/CategoryRouter';
import {
  alignTimestampToGranularity,
  buildWindowFromRange,
  deriveGranularityFromWindow,
  deriveRangeFromWindow,
  getSuggestedCacheTtlSeconds,
} from '@/earn-api/lib/historicalWindow';
import {
  ValidationError,
  assertAddress,
  parseEarnChainId,
  parseHistoricalRange,
  parseOpportunityCategory,
  parseOptionalAssetSymbol,
  parseOptionalTimestamp,
} from '@/earn-api/lib/validation';
import { HISTORICAL_VENDOR_TTL_SECONDS, type HistoricalData } from '@/earn-api/types';

export const revalidate = HISTORICAL_VENDOR_TTL_SECONDS;

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string; id: string } },
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = parseOpportunityCategory(params.category);
    const chainId = parseEarnChainId(searchParams.get('chainId'));
    const opportunityId = assertAddress(params.id, 'opportunityId');
    const range = parseHistoricalRange(searchParams.get('range'));
    const assetSymbol = parseOptionalAssetSymbol(searchParams.get('assetSymbol'));
    const fromTimestampParam = parseOptionalTimestamp(searchParams.get('from'), 'from');
    const toTimestampParam = parseOptionalTimestamp(searchParams.get('to'), 'to');

    let fromTimestamp: number;
    let toTimestamp: number;
    let granularity: '1hour' | '1day' | '1week';
    let resolvedRange = range;

    if (fromTimestampParam !== undefined || toTimestampParam !== undefined) {
      if (fromTimestampParam === undefined || toTimestampParam === undefined) {
        throw new ValidationError(
          'INVALID_DATE_RANGE',
          'Both from and to must be provided when using explicit date range',
        );
      }
      if (fromTimestampParam >= toTimestampParam) {
        throw new ValidationError('INVALID_DATE_RANGE', 'from must be before to');
      }
      fromTimestamp = fromTimestampParam;
      toTimestamp = toTimestampParam;
      granularity = deriveGranularityFromWindow(fromTimestamp, toTimestamp);
      fromTimestamp = alignTimestampToGranularity(fromTimestamp, granularity);
      toTimestamp = alignTimestampToGranularity(toTimestamp, granularity);
      if (fromTimestamp >= toTimestamp) {
        throw new ValidationError(
          'INVALID_DATE_RANGE',
          'from/to must span at least one granularity bucket',
        );
      }
      resolvedRange = deriveRangeFromWindow(fromTimestamp, toTimestamp);
    } else {
      const defaultWindow = buildWindowFromRange({ range });
      fromTimestamp = defaultWindow.fromTimestamp;
      toTimestamp = defaultWindow.toTimestamp;
      granularity = defaultWindow.granularity;
      resolvedRange = range;
    }

    const router = new CategoryRouter();
    const adapter = router.routeToAdapter(category);

    const historicalData: HistoricalData = await adapter.getHistoricalData(
      opportunityId,
      resolvedRange,
      chainId,
      { assetSymbol, fromTimestamp, toTimestamp, granularity, resolvedRange },
    );

    if (!historicalData) {
      throw new ValidationError('HISTORICAL_DATA_NOT_FOUND', 'No historical data found', 404);
    }

    const cacheTtlSeconds = Math.min(
      HISTORICAL_VENDOR_TTL_SECONDS,
      getSuggestedCacheTtlSeconds(granularity),
    );

    return NextResponse.json(historicalData, {
      headers: {
        'Cache-Control': `public, s-maxage=${cacheTtlSeconds}, stale-while-revalidate=${cacheTtlSeconds}, max-age=${cacheTtlSeconds}`,
      },
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    const routeError = error as { message?: string; code?: string; status?: number };
    return NextResponse.json(
      {
        message: routeError.message ?? 'Failed to fetch historical data',
        code: routeError.code ?? 'HISTORICAL_DATA_FETCH_ERROR',
      },
      { status: routeError.status ?? 500 },
    );
  }
}
