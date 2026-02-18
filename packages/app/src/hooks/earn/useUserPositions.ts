import { useMemo } from 'react';

import { useLocalStorageSWR } from '@/app-lib/swr/useLocalStorageSWR';

interface StandardUserPosition {
  opportunityId: string;
  category: 'lend';
  vendor: 'vaults';
  network: string;
  amount: string;
  amountFormatted: string;
  valueUsd: string;
  valueUsdNumber: number;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenIcon?: string;
  apy?: number;
  estimatedEarningsUsd?: string;
  estimatedEarningsUsdNumber?: number;
  opportunity: {
    id: string;
    name: string;
    protocol: string;
    apy?: number;
    tvl?: number;
  };
  isExpired?: boolean;
}

interface UserPositionsResponse {
  userAddress: string;
  positions: StandardUserPosition[];
  totalValueUsd: string;
  totalValueUsdNumber: number;
  estimatedEarningsUsd: string;
  estimatedEarningsUsdNumber: number;
  estimatedEarningsMonthlyUsd: string;
  estimatedEarningsMonthlyUsdNumber: number;
  estimatedEarningsYearlyPercentage: number;
  estimatedEarningsMonthlyPercentage: number;
  netApy: number;
  categoryApy: { lend: number };
  summary: {
    byCategory: { lend: { count: number; valueUsd: string; valueUsdNumber: number } };
    byVendor: { vaults: { count: number; valueUsd: string; valueUsdNumber: number } };
  };
  cachedAt?: number;
  expiresAt?: number;
  errors?: Array<{ category: string; error: string }>;
}

/**
 * Position data that can be merged onto opportunities
 */
export interface UserPositionData {
  deposited: string; // Formatted amount: "1,234.56 USDC"
  depositedUsd: string; // USD value: "$1,234.56"
  earnings: string; // Formatted APY or earnings: "3.5%"
  earningsUsd: string; // Estimated earnings: "$43.21"
  valueUsdNumber: number; // For calculations
  estimatedEarningsUsdNumber?: number; // For calculations
}

interface UseUserPositionsResult {
  /**
   * Map of opportunityId -> position data
   * Use this to enrich opportunities from useAllOpportunities
   */
  positionsMap: Map<string, UserPositionData>;
  /**
   * Set of opportunity IDs where user has positions
   * Use this to filter opportunities
   */
  opportunityIds: Set<string>;
  /**
   * Summary statistics
   */
  summary: UserPositionsResponse['summary'];
  totalValueUsd: string;
  totalValueUsdNumber: number;
  estimatedEarningsUsd: string;
  estimatedEarningsUsdNumber: number;
  estimatedEarningsMonthlyUsd: string;
  estimatedEarningsMonthlyUsdNumber: number;
  estimatedEarningsYearlyPercentage: number;
  estimatedEarningsMonthlyPercentage: number;
  netApy: number;
  categoryApy: { lend: number };
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
  // Cache the raw API response, then transform it
  const {
    data: rawData,
    error,
    isLoading,
    mutate,
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
      // Calculate estimated earnings: position value * APY (for 1 year)
      const apy = position.apy || position.opportunity.apy || 0;
      const estimatedEarningsUsdNumber =
        position.estimatedEarningsUsdNumber !== undefined
          ? position.estimatedEarningsUsdNumber
          : position.valueUsdNumber > 0 && apy > 0
            ? (position.valueUsdNumber * apy) / 100
            : 0;

      positionsMap.set(position.opportunityId.toLowerCase(), {
        deposited: position.amountFormatted,
        depositedUsd: position.valueUsd,
        earnings: '-', // No longer showing percentage, only dollar amount
        earningsUsd:
          estimatedEarningsUsdNumber > 0
            ? position.estimatedEarningsUsd || `$${estimatedEarningsUsdNumber.toFixed(2)}`
            : '-',
        valueUsdNumber: position.valueUsdNumber,
        estimatedEarningsUsdNumber,
      });

      opportunityIds.add(position.opportunityId.toLowerCase());
    }

    return {
      positionsMap,
      opportunityIds,
      summary: rawData.summary,
      totalValueUsd: rawData.totalValueUsd,
      totalValueUsdNumber: rawData.totalValueUsdNumber,
      estimatedEarningsUsd: rawData.estimatedEarningsUsd,
      estimatedEarningsUsdNumber: rawData.estimatedEarningsUsdNumber,
      estimatedEarningsMonthlyUsd: rawData.estimatedEarningsMonthlyUsd,
      estimatedEarningsMonthlyUsdNumber: rawData.estimatedEarningsMonthlyUsdNumber,
      estimatedEarningsYearlyPercentage: rawData.estimatedEarningsYearlyPercentage,
      estimatedEarningsMonthlyPercentage: rawData.estimatedEarningsMonthlyPercentage,
      netApy: rawData.netApy,
      categoryApy: rawData.categoryApy,
    };
  }, [rawData]);

  return {
    positionsMap: data?.positionsMap || new Map(),
    opportunityIds: data?.opportunityIds || new Set(),
    summary: data?.summary || {
      byCategory: { lend: { count: 0, valueUsd: '$0.00', valueUsdNumber: 0 } },
      byVendor: { vaults: { count: 0, valueUsd: '$0.00', valueUsdNumber: 0 } },
    },
    totalValueUsd: data?.totalValueUsd || '$0.00',
    totalValueUsdNumber: data?.totalValueUsdNumber || 0,
    estimatedEarningsUsd: data?.estimatedEarningsUsd || '$0.00',
    estimatedEarningsUsdNumber: data?.estimatedEarningsUsdNumber || 0,
    estimatedEarningsMonthlyUsd: data?.estimatedEarningsMonthlyUsd || '$0.00',
    estimatedEarningsMonthlyUsdNumber: data?.estimatedEarningsMonthlyUsdNumber || 0,
    estimatedEarningsYearlyPercentage: data?.estimatedEarningsYearlyPercentage || 0,
    estimatedEarningsMonthlyPercentage: data?.estimatedEarningsMonthlyPercentage || 0,
    netApy: data?.netApy || 0,
    categoryApy: data?.categoryApy || { lend: 0 },
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
  };
}
