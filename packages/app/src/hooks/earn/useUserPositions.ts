import { BigNumber } from 'ethers';
import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { OPPORTUNITY_CATEGORIES, OpportunityCategory } from '@/app-types/earn/vaults';
import { ChainId } from '@/bridge/types/ChainId';
import { formatAmount } from '@/bridge/util/NumberUtils';
import { type EarnChainId, type UserPositionsResponse } from '@/earn-api/types';

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

interface MappedUserPositionsData {
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
}

export function mapUserPositionsData(rawData: UserPositionsResponse): MappedUserPositionsData {
  const positionsMap = new Map<string, UserPositionData>();
  const opportunityIds = new Set<string>();

  for (const position of rawData.positions) {
    const normalizedOpportunityId = position.opportunityId.toLowerCase();
    const apy = position.opportunity.apy || 0;
    const projectedEarningsUsd =
      position.projectedEarningsUsd ??
      (position.valueUsd > 0 && apy > 0 ? (position.valueUsd * apy) / 100 : 0);
    const deposited = formatAmount(BigNumber.from(position.amount), {
      decimals: position.tokenDecimals,
      symbol: position.tokenSymbol,
    });

    positionsMap.set(normalizedOpportunityId, {
      deposited,
      valueUsd: position.valueUsd,
      projectedEarningsUsd,
    });

    opportunityIds.add(normalizedOpportunityId);
  }

  const byCategory = { ...DEFAULT_BY_CATEGORY };
  for (const category of OPPORTUNITY_CATEGORIES) {
    const summaryEntry = rawData.summary.byCategory[category];
    if (!summaryEntry) continue;
    byCategory[category] = {
      count: summaryEntry.count,
      valueUsd: summaryEntry.valueUsd,
    };
  }

  const categoryApy = { ...DEFAULT_CATEGORY_APY };
  for (const category of OPPORTUNITY_CATEGORIES) {
    const rawApy = rawData.categoryApy[category];
    if (rawApy === undefined || rawApy === null || !isFinite(rawApy)) continue;
    categoryApy[category] = rawApy;
  }

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
}

export function useUserPositions(
  userAddress: string | null,
  allowedChainIds: EarnChainId[] = [ChainId.ArbitrumOne],
): UseUserPositionsResult {
  const primaryChainId = allowedChainIds[0] ?? ChainId.ArbitrumOne;
  const swrKey = userAddress ? ([userAddress, primaryChainId, 'userPositions'] as const) : null;

  const {
    data: rawData,
    error,
    isLoading,
    mutate,
    ...rest
  } = useSWRImmutable<UserPositionsResponse>(
    swrKey,
    async ([keyUserAddress, keyChainId]: readonly [string, EarnChainId, 'userPositions']) => {
      const params = new URLSearchParams({
        userAddress: keyUserAddress,
        chainId: String(keyChainId),
      });

      const response = await fetch(`/api/onchain-actions/v1/earn/positions?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.statusText}`);
      }

      return (await response.json()) as UserPositionsResponse;
    },
    { errorRetryCount: 2 },
  );

  const data = useMemo(() => (rawData ? mapUserPositionsData(rawData) : null), [rawData]);

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
