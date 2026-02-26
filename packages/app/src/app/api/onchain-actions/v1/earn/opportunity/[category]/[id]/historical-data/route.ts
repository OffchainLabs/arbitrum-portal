import { NextRequest, NextResponse } from 'next/server';

import { CategoryRouter } from '@/earn-api/CategoryRouter';
import {
  ValidationError,
  assertAddress,
  parseEarnChainId,
  parseHistoricalRange,
  parseOpportunityCategory,
  parseOptionalAssetSymbol,
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

    const router = new CategoryRouter();
    const adapter = router.routeToAdapter(category);

    const historicalData: HistoricalData = await adapter.getHistoricalData(
      opportunityId,
      range,
      chainId,
      { assetSymbol },
    );

    if (!historicalData) {
      throw new ValidationError('HISTORICAL_DATA_NOT_FOUND', 'No historical data found', 404);
    }

    return NextResponse.json(historicalData, {
      headers: {
        'Cache-Control': `public, s-maxage=${HISTORICAL_VENDOR_TTL_SECONDS}, stale-while-revalidate=${HISTORICAL_VENDOR_TTL_SECONDS}, max-age=${HISTORICAL_VENDOR_TTL_SECONDS}`,
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
