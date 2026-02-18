import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { OpportunityCategory } from '@/app-types/earn/vaults';

import { CategoryRouter } from '../CategoryRouter';
import { StandardUserPosition, Vendor } from '../types';

const ALLOWED_NETWORKS = ['arbitrum', 'mainnet'] as const;

function calculatePositionsSummary(positions: StandardUserPosition[]) {
  const byCategory: Record<
    string,
    { count: number; valueUsdNumber: number; weightedApySum: number }
  > = {
    [OpportunityCategory.Lend]: { count: 0, valueUsdNumber: 0, weightedApySum: 0 },
  };

  const byVendor: Record<string, { count: number; valueUsdNumber: number }> = {
    [Vendor.Vaults]: { count: 0, valueUsdNumber: 0 },
  };

  let totalValueUsdNumber = 0;
  let estimatedEarningsUsdNumber = 0;
  let weightedApySum = 0;

  for (const position of positions) {
    const valueUsdNumber = Number(position.valueUsdNumber) || 0;
    if (!isFinite(valueUsdNumber) || valueUsdNumber < 0) continue;

    const apy = position.opportunity?.apy ?? position.apy ?? 0;
    const apyNumber = Number(apy) || 0;
    if (isFinite(apyNumber) && apyNumber >= 0) {
      estimatedEarningsUsdNumber += valueUsdNumber * (apyNumber / 100);
      weightedApySum += apyNumber * valueUsdNumber;
    }

    totalValueUsdNumber += valueUsdNumber;

    const catKey = position.category;
    if (!byCategory[catKey]) {
      byCategory[catKey] = { count: 0, valueUsdNumber: 0, weightedApySum: 0 };
    }
    const cat = byCategory[catKey]!;
    cat.count++;
    cat.valueUsdNumber += valueUsdNumber;
    if (isFinite(apyNumber) && apyNumber >= 0) {
      cat.weightedApySum += apyNumber * valueUsdNumber;
    }

    const vendorKey = position.vendor;
    if (!byVendor[vendorKey]) {
      byVendor[vendorKey] = { count: 0, valueUsdNumber: 0 };
    }
    const vendor = byVendor[vendorKey]!;
    vendor.count++;
    vendor.valueUsdNumber += valueUsdNumber;
  }

  // Net APY = weighted mean of all positions' APY's by their $ value
  const netApy = totalValueUsdNumber > 0 ? weightedApySum / totalValueUsdNumber : 0;

  const lendCat = byCategory[OpportunityCategory.Lend] ?? {
    count: 0,
    valueUsdNumber: 0,
    weightedApySum: 0,
  };
  const categoryApy = {
    lend: lendCat.valueUsdNumber > 0 ? lendCat.weightedApySum / lendCat.valueUsdNumber : 0,
  };

  // Calculate monthly earnings (yearly / 12)
  const estimatedEarningsMonthlyUsdNumber = estimatedEarningsUsdNumber / 12;

  // Calculate percentages
  const estimatedEarningsYearlyPercentage =
    totalValueUsdNumber > 0 ? (estimatedEarningsUsdNumber / totalValueUsdNumber) * 100 : 0;
  const estimatedEarningsMonthlyPercentage =
    totalValueUsdNumber > 0 ? (estimatedEarningsMonthlyUsdNumber / totalValueUsdNumber) * 100 : 0;

  return {
    totalValueUsdNumber,
    estimatedEarningsUsd: `$${estimatedEarningsUsdNumber.toFixed(2)}`,
    estimatedEarningsUsdNumber,
    estimatedEarningsMonthlyUsd: `$${estimatedEarningsMonthlyUsdNumber.toFixed(2)}`,
    estimatedEarningsMonthlyUsdNumber,
    estimatedEarningsYearlyPercentage,
    estimatedEarningsMonthlyPercentage,
    netApy,
    categoryApy,
    byCategory: {
      [OpportunityCategory.Lend]: {
        count: lendCat.count,
        valueUsd: `$${lendCat.valueUsdNumber.toFixed(2)}`,
        valueUsdNumber: lendCat.valueUsdNumber,
      },
    },
    byVendor: Object.fromEntries(
      Object.entries(byVendor).map(([k, v]) => [
        k,
        {
          count: v.count,
          valueUsd: `$${v.valueUsdNumber.toFixed(2)}`,
          valueUsdNumber: v.valueUsdNumber,
        },
      ]),
    ) as Record<Vendor, { count: number; valueUsd: string; valueUsdNumber: number }>,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');
    const categoryParam = searchParams.get('category');
    const category = categoryParam as OpportunityCategory | null;
    const network = searchParams.get('network') || 'arbitrum';

    if (!userAddress) {
      return NextResponse.json(
        { error: { code: 'MISSING_USER_ADDRESS', message: 'userAddress is required' } },
        { status: 400 },
      );
    }
    if (!isAddress(userAddress)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_USER_ADDRESS',
            message: 'userAddress must be a valid Ethereum address',
          },
        },
        { status: 400 },
      );
    }
    if (network && !ALLOWED_NETWORKS.includes(network as (typeof ALLOWED_NETWORKS)[number])) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_NETWORK',
            message: `network must be one of: ${ALLOWED_NETWORKS.join(', ')}`,
          },
        },
        { status: 400 },
      );
    }

    const cacheKey = `positions:${userAddress}:${category ?? 'all'}:${network}`;

    const getCachedPositions = unstable_cache(
      async () => {
        const router = new CategoryRouter();
        let allPositions: StandardUserPosition[] = [];
        const errors: Array<{ category: string; error: string }> = [];

        if (category) {
          try {
            const adapter = router.routeToAdapter(category);
            allPositions = await adapter.getUserPositions(userAddress, network);
          } catch (error) {
            errors.push({
              category,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        } else {
          // Fetch positions from all adapters in parallel
          const adapters = router.getAllAdapters();
          const results = await Promise.allSettled(
            adapters.map(async (adapter) => {
              try {
                return await adapter.getUserPositions(userAddress, network);
              } catch (error) {
                errors.push({
                  category: adapter.vendor,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
                return [];
              }
            }),
          );
          allPositions = results
            .filter((result) => result.status === 'fulfilled')
            .flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
        }

        // Calculate summary statistics
        const summary = calculatePositionsSummary(allPositions);

        return {
          userAddress,
          positions: allPositions,
          totalValueUsd: `$${summary.totalValueUsdNumber.toFixed(2)}`,
          totalValueUsdNumber: summary.totalValueUsdNumber,
          estimatedEarningsUsd: summary.estimatedEarningsUsd,
          estimatedEarningsUsdNumber: summary.estimatedEarningsUsdNumber,
          estimatedEarningsMonthlyUsd: summary.estimatedEarningsMonthlyUsd,
          estimatedEarningsMonthlyUsdNumber: summary.estimatedEarningsMonthlyUsdNumber,
          estimatedEarningsYearlyPercentage: summary.estimatedEarningsYearlyPercentage,
          estimatedEarningsMonthlyPercentage: summary.estimatedEarningsMonthlyPercentage,
          netApy: summary.netApy,
          categoryApy: summary.categoryApy,
          summary,
          errors: errors.length > 0 ? errors : undefined, // Include errors if any
        };
      },
      [cacheKey],
      {
        revalidate: 300, // 5 minutes (positions change frequently)
        tags: ['positions', userAddress, cacheKey],
      },
    );

    const result = await getCachedPositions();

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json(
      {
        error: {
          code: 'POSITIONS_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch positions',
        },
      },
      { status: 500 },
    );
  }
}
