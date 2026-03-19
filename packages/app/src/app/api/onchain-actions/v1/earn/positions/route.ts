import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { OpportunityCategory } from '@/app-types/earn/vaults';

import { CategoryRouter } from '../CategoryRouter';
import {
  assertAddress,
  parseEarnChainId,
  parseOptionalOpportunityCategory,
} from '../lib/validation';
import { StandardUserPosition, Vendor } from '../types';

const router = new CategoryRouter();

const ALL_CATEGORIES: readonly OpportunityCategory[] = [
  OpportunityCategory.Lend,
  OpportunityCategory.LiquidStaking,
  OpportunityCategory.FixedYield,
];

function calculatePositionsSummary(positions: StandardUserPosition[]) {
  const byCategory: Record<
    OpportunityCategory,
    { count: number; valueUsd: number; weightedApySum: number }
  > = {
    [OpportunityCategory.Lend]: { count: 0, valueUsd: 0, weightedApySum: 0 },
    [OpportunityCategory.LiquidStaking]: { count: 0, valueUsd: 0, weightedApySum: 0 },
    [OpportunityCategory.FixedYield]: { count: 0, valueUsd: 0, weightedApySum: 0 },
  };

  const byVendor: Record<string, { count: number; valueUsd: number }> = {
    [Vendor.Vaults]: { count: 0, valueUsd: 0 },
  };

  let totalValueUsd = 0;
  let projectedEarningsUsd = 0;
  let weightedApySum = 0;

  for (const position of positions) {
    const valueUsd = Number(position.valueUsd) || 0;
    if (!isFinite(valueUsd) || valueUsd < 0) continue;

    const apy = position.opportunity?.apy ?? 0;
    const apyNumber = Number(apy) || 0;
    if (isFinite(apyNumber) && apyNumber >= 0) {
      projectedEarningsUsd += valueUsd * (apyNumber / 100);
      weightedApySum += apyNumber * valueUsd;
    }

    totalValueUsd += valueUsd;

    const categoryStats = byCategory[position.category];
    categoryStats.count++;
    categoryStats.valueUsd += valueUsd;
    if (isFinite(apyNumber) && apyNumber >= 0) {
      categoryStats.weightedApySum += apyNumber * valueUsd;
    }

    const vendorKey = position.vendor;
    if (!byVendor[vendorKey]) {
      byVendor[vendorKey] = { count: 0, valueUsd: 0 };
    }
    const vendor = byVendor[vendorKey];
    if (vendor) {
      vendor.count++;
      vendor.valueUsd += valueUsd;
    }
  }

  const netApy = totalValueUsd > 0 ? weightedApySum / totalValueUsd : 0;

  const categoryApy = Object.fromEntries(
    ALL_CATEGORIES.map((category) => {
      const categoryStats = byCategory[category];
      const apy =
        categoryStats.valueUsd > 0 ? categoryStats.weightedApySum / categoryStats.valueUsd : 0;
      return [category, apy];
    }),
  ) as Record<OpportunityCategory, number>;

  const byCategorySummary = Object.fromEntries(
    ALL_CATEGORIES.map((category) => {
      const categoryStats = byCategory[category];
      return [category, { count: categoryStats.count, valueUsd: categoryStats.valueUsd }];
    }),
  ) as Record<OpportunityCategory, { count: number; valueUsd: number }>;

  const projectedEarningsMonthlyUsd = projectedEarningsUsd / 12;
  const projectedEarningsYearlyPercentage =
    totalValueUsd > 0 ? (projectedEarningsUsd / totalValueUsd) * 100 : 0;
  const projectedEarningsMonthlyPercentage =
    totalValueUsd > 0 ? (projectedEarningsMonthlyUsd / totalValueUsd) * 100 : 0;

  return {
    totalValueUsd,
    projectedEarningsUsd,
    projectedEarningsMonthlyUsd,
    projectedEarningsYearlyPercentage,
    projectedEarningsMonthlyPercentage,
    netApy,
    categoryApy,
    byCategory: byCategorySummary,
    byVendor: Object.fromEntries(
      Object.entries(byVendor).map(([k, v]) => [k, { count: v.count, valueUsd: v.valueUsd }]),
    ),
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = assertAddress(searchParams.get('userAddress'), 'userAddress');
    const category = parseOptionalOpportunityCategory(searchParams.get('category'));
    const chainId = parseEarnChainId(searchParams.get('chainId'));

    const cacheKey = `positions:${userAddress}:${category ?? 'all'}:${chainId}`;

    const getCachedPositions = unstable_cache(
      async () => {
        let allPositions: StandardUserPosition[] = [];
        const errors: Array<{ category: string; error: string }> = [];

        if (category) {
          try {
            const adapter = router.routeToAdapter(category);
            allPositions = await adapter.getUserPositions(userAddress, chainId);
          } catch (error) {
            errors.push({
              category,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        } else {
          const adapters = router.getAllAdapters();
          const results = await Promise.allSettled(
            adapters.map(async (adapter) => {
              try {
                return await adapter.getUserPositions(userAddress, chainId);
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

        const summary = calculatePositionsSummary(allPositions);

        return {
          userAddress,
          positions: allPositions,
          totalValueUsd: summary.totalValueUsd,
          projectedEarningsUsd: summary.projectedEarningsUsd,
          projectedEarningsMonthlyUsd: summary.projectedEarningsMonthlyUsd,
          projectedEarningsYearlyPercentage: summary.projectedEarningsYearlyPercentage,
          projectedEarningsMonthlyPercentage: summary.projectedEarningsMonthlyPercentage,
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
    const routeError = error as { message?: string; code?: string; status?: number };
    return NextResponse.json(
      {
        message: routeError.message ?? 'Failed to fetch positions',
        code: routeError.code ?? 'POSITIONS_FETCH_ERROR',
      },
      { status: routeError.status ?? 500 },
    );
  }
}
