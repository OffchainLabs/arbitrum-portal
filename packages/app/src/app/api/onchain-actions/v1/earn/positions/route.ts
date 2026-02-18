import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { CategoryRouter } from '../CategoryRouter';
import { OpportunityCategory, StandardUserPosition } from '../types';

function calculatePositionsSummary(positions: StandardUserPosition[]) {
  const byCategory = {
    [OpportunityCategory.Lend]: { count: 0, valueUsdNumber: 0, weightedApySum: 0 },
  };

  const byVendor = {
    vaults: { count: 0, valueUsdNumber: 0 },
  };

  let totalValueUsdNumber = 0;
  let estimatedEarningsUsdNumber = 0;
  let weightedApySum = 0;

  for (const position of positions) {
    // Handle NaN, undefined, or null values
    const valueUsdNumber = Number(position.valueUsdNumber) || 0;
    if (!isFinite(valueUsdNumber) || valueUsdNumber < 0) {
      continue; // Skip invalid values
    }

    // Get APY from position or opportunity metadata
    const apy = position.apy ?? position.opportunity.apy ?? 0;
    const apyNumber = Number(apy) || 0;
    if (isFinite(apyNumber) && apyNumber >= 0) {
      // Estimated Earnings = position value * APY (expected earnings if maintained for 1 year)
      estimatedEarningsUsdNumber += valueUsdNumber * (apyNumber / 100);
      // Weighted APY sum for calculating weighted mean
      weightedApySum += apyNumber * valueUsdNumber;
      // Category-specific weighted APY sum
      byCategory[position.category].weightedApySum += apyNumber * valueUsdNumber;
    }

    totalValueUsdNumber += valueUsdNumber;

    byCategory[position.category].count++;
    byCategory[position.category].valueUsdNumber += valueUsdNumber;

    byVendor[position.vendor].count++;
    byVendor[position.vendor].valueUsdNumber += valueUsdNumber;
  }

  // Net APY = weighted mean of all positions' APY's by their $ value
  const netApy = totalValueUsdNumber > 0 ? weightedApySum / totalValueUsdNumber : 0;

  const lendCat = byCategory[OpportunityCategory.Lend];
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
        count: byCategory[OpportunityCategory.Lend].count,
        valueUsd: `$${byCategory[OpportunityCategory.Lend].valueUsdNumber.toFixed(2)}`,
        valueUsdNumber: byCategory[OpportunityCategory.Lend].valueUsdNumber,
      },
    },
    byVendor: {
      vaults: {
        count: byVendor.vaults.count,
        valueUsd: `$${byVendor.vaults.valueUsdNumber.toFixed(2)}`,
        valueUsdNumber: byVendor.vaults.valueUsdNumber,
      },
    },
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

    const cacheKey = `positions:${userAddress}:${category || 'all'}:${network}`;

    const getCachedPositions = unstable_cache(
      async () => {
        const router = new CategoryRouter();
        let allPositions: StandardUserPosition[] = [];
        const errors: Array<{ category: string; error: string }> = [];

        if (category) {
          // Fetch positions from specific category adapter
          try {
            const adapter = router.routeToAdapter(category);
            const positions = await adapter.getUserPositions(userAddress, network);
            allPositions = positions;
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
