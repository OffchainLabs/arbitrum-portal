import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { OpportunityCategory } from '@/app-types/earn/vaults';
import { type EarnNetwork, type UserPositionsResponse } from '@/earn-api/types';

const DEFAULT_BY_CATEGORY: Record<OpportunityCategory, { count: number; valueUsd: number }> = {
  [OpportunityCategory.Lend]: { count: 0, valueUsd: 0 },
  [OpportunityCategory.LiquidStaking]: { count: 0, valueUsd: 0 },
  [OpportunityCategory.FixedYield]: { count: 0, valueUsd: 0 },
};

const DEFAULT_CATEGORY_APY: Record<OpportunityCategory, number> = {
  [OpportunityCategory.Lend]: 0,
  [OpportunityCategory.LiquidStaking]: 0,
  [OpportunityCategory.FixedYield]: 0,
};

export interface UserPositionData {
  deposited: string;
  valueUsd: number;
  estimatedEarningsUsd: number;
  earnings: string;
}

interface UseUserPositionsResult {
  positionsMap: Map<string, UserPositionData>;
  opportunityIds: Set<string>;
  summary: UserPositionsResponse['summary'];
  totalValueUsd: number;
  estimatedEarningsUsd: number;
  estimatedEarningsMonthlyUsd: number;
  estimatedEarningsYearlyPercentage: number;
  estimatedEarningsMonthlyPercentage: number;
  netApy: number;
  categoryApy: Record<OpportunityCategory, number>;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch user positions (Lend / Vaults) using the standardized API
 * Returns position data that can be merged with opportunities from useAllOpportunities
 */
export function useUserPositions(
  userAddress: string | null,
  allowedNetworks: EarnNetwork[] = ['arbitrum'],
): UseUserPositionsResult {
  const primaryNetwork = allowedNetworks[0] ?? 'arbitrum';
  const swrKey = userAddress ? ([userAddress, primaryNetwork, 'userPositions'] as const) : null;

  const {
    data: rawData,
    error,
    isLoading,
    mutate,
    ...rest
  } = useSWRImmutable<UserPositionsResponse>(
    swrKey,
    async ([keyUserAddress, network]: readonly [string, string, string]) => {
      const params = new URLSearchParams({
        userAddress: keyUserAddress,
        network,
      });

      const response = await fetch(`/api/onchain-actions/v1/earn/positions?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.statusText}`);
      }

      return (await response.json()) as UserPositionsResponse;
    },
    { refreshInterval: 12 * 60 * 60 * 1000, errorRetryCount: 2 },
  );

  // Transform raw API response to Map/Set (happens on every render, but data is cached)
  const data = useMemo(() => {
    if (!rawData) return null;

    // Create a map of opportunityId -> position data
    const positionsMap = new Map<string, UserPositionData>();
    const opportunityIds = new Set<string>();

    for (const position of rawData.positions) {
      const apy = position.opportunity.apy || 0;
      const estimatedEarningsUsd =
        position.estimatedEarningsUsd ??
        (position.valueUsd > 0 && apy > 0 ? (position.valueUsd * apy) / 100 : 0);

      positionsMap.set(position.opportunityId, {
        deposited: position.amountFormatted,
        valueUsd: position.valueUsd,
        estimatedEarningsUsd,
        earnings: '-',
      });

      opportunityIds.add(position.opportunityId);
    }

    const byCategory = { ...DEFAULT_BY_CATEGORY, ...rawData.summary.byCategory };
    const categoryApy = { ...DEFAULT_CATEGORY_APY, ...rawData.categoryApy };
    return {
      positionsMap,
      opportunityIds,
      summary: { byCategory, byVendor: rawData.summary.byVendor },
      totalValueUsd: rawData.totalValueUsd,
      estimatedEarningsUsd: rawData.estimatedEarningsUsd,
      estimatedEarningsMonthlyUsd: rawData.estimatedEarningsMonthlyUsd,
      estimatedEarningsYearlyPercentage: rawData.estimatedEarningsYearlyPercentage,
      estimatedEarningsMonthlyPercentage: rawData.estimatedEarningsMonthlyPercentage,
      netApy: rawData.netApy,
      categoryApy,
    };
  }, [rawData]);

  const defaultSummary = {
    byCategory: DEFAULT_BY_CATEGORY,
    byVendor: {},
  };

  return {
    positionsMap: data?.positionsMap || new Map(),
    opportunityIds: data?.opportunityIds || new Set(),
    summary: data?.summary || defaultSummary,
    totalValueUsd: data?.totalValueUsd ?? 0,
    estimatedEarningsUsd: data?.estimatedEarningsUsd ?? 0,
    estimatedEarningsMonthlyUsd: data?.estimatedEarningsMonthlyUsd ?? 0,
    estimatedEarningsYearlyPercentage: data?.estimatedEarningsYearlyPercentage ?? 0,
    estimatedEarningsMonthlyPercentage: data?.estimatedEarningsMonthlyPercentage ?? 0,
    netApy: data?.netApy ?? 0,
    categoryApy: data?.categoryApy || DEFAULT_CATEGORY_APY,
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
    ...rest,
  };
}
