import { BigNumber } from 'ethers';
import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { OpportunityCategory } from '@/app-types/earn/vaults';
import { formatAmount } from '@/bridge/util/NumberUtils';
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
  projectedEarningsUsd: number;
  earnings: string;
}

interface UseUserPositionsResult {
  positionsMap: Map<string, UserPositionData>;
  opportunityIds: Set<string>;
  summary: UserPositionsResponse['summary'];
  totalValueUsd: number;
  projectedEarningsUsd: number;
  projectedEarningsMonthlyUsd: number;
  projectedEarningsYearlyPercentage: number;
  projectedEarningsMonthlyPercentage: number;
  netApy: number;
  categoryApy: Record<OpportunityCategory, number>;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

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
    async ([keyUserAddress, keyNetwork]: readonly [string, EarnNetwork, 'userPositions']) => {
      const params = new URLSearchParams({
        userAddress: keyUserAddress,
        network: keyNetwork,
      });

      const response = await fetch(`/api/onchain-actions/v1/earn/positions?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.statusText}`);
      }

      return (await response.json()) as UserPositionsResponse;
    },
    { refreshInterval: 12 * 60 * 60 * 1000, errorRetryCount: 2 },
  );

  const data = useMemo(() => {
    if (!rawData) return null;

    const positionsMap = new Map<string, UserPositionData>();
    const opportunityIds = new Set<string>();

    for (const position of rawData.positions) {
      const apy = position.opportunity.apy || 0;
      const projectedEarningsUsd =
        position.projectedEarningsUsd ??
        (position.valueUsd > 0 && apy > 0 ? (position.valueUsd * apy) / 100 : 0);
      const deposited = formatAmount(BigNumber.from(position.amount), {
        decimals: position.tokenDecimals,
        symbol: position.tokenSymbol,
      });

      positionsMap.set(position.opportunityId, {
        deposited,
        valueUsd: position.valueUsd,
        projectedEarningsUsd,
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
      projectedEarningsUsd: rawData.projectedEarningsUsd,
      projectedEarningsMonthlyUsd: rawData.projectedEarningsMonthlyUsd,
      projectedEarningsYearlyPercentage: rawData.projectedEarningsYearlyPercentage,
      projectedEarningsMonthlyPercentage: rawData.projectedEarningsMonthlyPercentage,
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
    projectedEarningsUsd: data?.projectedEarningsUsd ?? 0,
    projectedEarningsMonthlyUsd: data?.projectedEarningsMonthlyUsd ?? 0,
    projectedEarningsYearlyPercentage: data?.projectedEarningsYearlyPercentage ?? 0,
    projectedEarningsMonthlyPercentage: data?.projectedEarningsMonthlyPercentage ?? 0,
    netApy: data?.netApy ?? 0,
    categoryApy: data?.categoryApy || DEFAULT_CATEGORY_APY,
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
    ...rest,
  };
}
