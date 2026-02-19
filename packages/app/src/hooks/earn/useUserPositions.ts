import { useMemo } from 'react';

import { useLocalStorageSWR } from '@/app-lib/swr/useLocalStorageSWR';
import { OpportunityCategory } from '@/app-types/earn/vaults';

interface StandardUserPosition {
  opportunityId: string;
  category: OpportunityCategory;
  vendor: 'vaults';
  network: string;
  amount: string;
  amountFormatted: string;
  valueUsd: number;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenIcon?: string;
  apy?: number;
  estimatedEarningsUsd?: number;
  opportunity: {
    id: string;
    name: string;
    protocol: string;
    apy?: number;
    tvl?: number;
  };
  isExpired?: boolean;
}

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

interface UserPositionsResponse {
  userAddress: string;
  positions: StandardUserPosition[];
  totalValueUsd: number;
  estimatedEarningsUsd: number;
  estimatedEarningsMonthlyUsd: number;
  estimatedEarningsYearlyPercentage: number;
  estimatedEarningsMonthlyPercentage: number;
  netApy: number;
  categoryApy: Partial<Record<OpportunityCategory, number>>;
  summary: {
    byCategory: Partial<Record<OpportunityCategory, { count: number; valueUsd: number }>>;
    byVendor: { vaults: { count: number; valueUsd: number } };
  };
  cachedAt?: number;
  expiresAt?: number;
  errors?: Array<{ category: string; error: string }>;
}

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
  allowedNetworks: string[] = ['arbitrum'],
): UseUserPositionsResult {
  const {
    data: rawData,
    error,
    isLoading,
    mutate,
    ...rest
  } = useLocalStorageSWR<UserPositionsResponse>(
    userAddress ? ['userPositions', userAddress, allowedNetworks.join(',')] : null,
    async () => {
      if (!userAddress) {
        throw new Error('User address is required');
      }

      // Use the standardized positions endpoint
      const params = new URLSearchParams({
        userAddress,
        network: allowedNetworks[0] || 'arbitrum', // Currently only supports arbitrum
      });

      const response = await fetch(`/api/onchain-actions/v1/earn/positions?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.statusText}`);
      }

      return (await response.json()) as UserPositionsResponse;
    },
    {
      // Conservative: 24 hours, Aggressive: 12 hours
      // Using 12 hours (43200000ms) as default
      refreshInterval: 12 * 60 * 60 * 1000, // 12 hours
      revalidateOnFocus: false,
      revalidateOnReconnect: false, // Don't auto-refetch on reconnect - respect cache
      revalidateIfStale: false, // Don't revalidate if stale - only on interval or manual
      errorRetryCount: 2,
    },
  );

  // Transform raw API response to Map/Set (happens on every render, but data is cached)
  const data = useMemo(() => {
    if (!rawData) return null;

    // Create a map of opportunityId -> position data
    const positionsMap = new Map<string, UserPositionData>();
    const opportunityIds = new Set<string>();

    for (const position of rawData.positions) {
      const apy = position.apy || position.opportunity.apy || 0;
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
    byVendor: { vaults: { count: 0, valueUsd: 0 } } as const,
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
