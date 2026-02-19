import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { OpportunityCategory } from '@/app-types/earn/vaults';

import { CategoryRouter } from '../CategoryRouter';
import { StandardUserPosition, Vendor } from '../types';

const ALLOWED_NETWORKS = ['arbitrum', 'mainnet'] as const;

function calculatePositionsSummary(positions: StandardUserPosition[]) {
  const byCategory: Record<string, { count: number; valueUsd: number; weightedApySum: number }> = {
    [OpportunityCategory.Lend]: { count: 0, valueUsd: 0, weightedApySum: 0 },
  };

  const byVendor: Record<string, { count: number; valueUsd: number }> = {
    [Vendor.Vaults]: { count: 0, valueUsd: 0 },
  };

  let totalValueUsd = 0;
  let estimatedEarningsUsd = 0;
  let weightedApySum = 0;

  for (const position of positions) {
    const valueUsd = Number(position.valueUsd) || 0;
    if (!isFinite(valueUsd) || valueUsd < 0) continue;

    const apy = position.opportunity?.apy ?? position.apy ?? 0;
    const apyNumber = Number(apy) || 0;
    if (isFinite(apyNumber) && apyNumber >= 0) {
      estimatedEarningsUsd += valueUsd * (apyNumber / 100);
      weightedApySum += apyNumber * valueUsd;
    }

    totalValueUsd += valueUsd;

    const catKey = position.category;
    if (!byCategory[catKey]) {
      byCategory[catKey] = { count: 0, valueUsd: 0, weightedApySum: 0 };
    }
    const cat = byCategory[catKey]!;
    cat.count++;
    cat.valueUsd += valueUsd;
    if (isFinite(apyNumber) && apyNumber >= 0) {
      cat.weightedApySum += apyNumber * valueUsd;
    }

    const vendorKey = position.vendor;
    if (!byVendor[vendorKey]) {
      byVendor[vendorKey] = { count: 0, valueUsd: 0 };
    }
    const vendor = byVendor[vendorKey]!;
    vendor.count++;
    vendor.valueUsd += valueUsd;
  }

  const netApy = totalValueUsd > 0 ? weightedApySum / totalValueUsd : 0;

  const lendCat = byCategory[OpportunityCategory.Lend] ?? {
    count: 0,
    valueUsd: 0,
    weightedApySum: 0,
  };
  const categoryApy = {
    lend: lendCat.valueUsd > 0 ? lendCat.weightedApySum / lendCat.valueUsd : 0,
  };

  const estimatedEarningsMonthlyUsd = estimatedEarningsUsd / 12;
  const estimatedEarningsYearlyPercentage =
    totalValueUsd > 0 ? (estimatedEarningsUsd / totalValueUsd) * 100 : 0;
  const estimatedEarningsMonthlyPercentage =
    totalValueUsd > 0 ? (estimatedEarningsMonthlyUsd / totalValueUsd) * 100 : 0;

  return {
    totalValueUsd,
    estimatedEarningsUsd,
    estimatedEarningsMonthlyUsd,
    estimatedEarningsYearlyPercentage,
    estimatedEarningsMonthlyPercentage,
    netApy,
    categoryApy,
    byCategory: {
      [OpportunityCategory.Lend]: {
        count: lendCat.count,
        valueUsd: lendCat.valueUsd,
      },
    },
    byVendor: Object.fromEntries(
      Object.entries(byVendor).map(([k, v]) => [k, { count: v.count, valueUsd: v.valueUsd }]),
    ) as Record<Vendor, { count: number; valueUsd: number }>,
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
          totalValueUsd: summary.totalValueUsd,
          estimatedEarningsUsd: summary.estimatedEarningsUsd,
          estimatedEarningsMonthlyUsd: summary.estimatedEarningsMonthlyUsd,
          estimatedEarningsYearlyPercentage: summary.estimatedEarningsYearlyPercentage,
          estimatedEarningsMonthlyPercentage: summary.estimatedEarningsMonthlyPercentage,
          netApy: summary.netApy,
          categoryApy: summary.categoryApy,
          summary: {
            byCategory: summary.byCategory,
            byVendor: summary.byVendor,
          },
          errors: errors.length > 0 ? errors : undefined,
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
