'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useAccount, useAccountEffect } from 'wagmi';

import { useAllOpportunities } from '@/app-hooks/earn/useAllOpportunities';
import { useUserPositions } from '@/app-hooks/earn/useUserPositions';
import { OpportunityTableRow } from '@/app-types/earn/vaults';

import { OpportunitiesTable } from './OpportunitiesTable';
import { PortfolioSummaryCards } from './PortfolioSummaryCards';
import { YourHoldingsEmptyState } from './YourHoldingsEmptyState';
import { YourHoldingsPageSkeleton } from './YourHoldingsPageSkeleton';

export function MyPositionsPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  useAccountEffect({
    onDisconnect() {
      router.replace('/earn/market');
    },
  });

  const {
    opportunities: allOpportunities,
    isLoading: opportunitiesLoading,
    error: opportunitiesError,
  } = useAllOpportunities({ minTvl: 5_000_000 });

  const {
    positionsMap,
    opportunityIds,
    summary,
    projectedEarningsUsd,
    projectedEarningsMonthlyUsd,
    projectedEarningsYearlyPercentage,
    projectedEarningsMonthlyPercentage,
    netApy,
    categoryApy,
    totalValueUsd,
    isLoading: positionsLoading,
    error: positionsError,
  } = useUserPositions(address || null, ['arbitrum']);

  const opportunitiesWithPositions = useMemo(() => {
    return allOpportunities
      .filter((opp) => {
        return (
          opportunityIds.has(opp.id) ||
          (opp.vaultAddress !== undefined && opportunityIds.has(opp.vaultAddress))
        );
      })
      .map((opp) => {
        const positionData =
          positionsMap.get(opp.id) ||
          (opp.vaultAddress ? positionsMap.get(opp.vaultAddress) : undefined);

        if (!positionData) {
          return opp;
        }

        return {
          ...opp,
          deposited: positionData.deposited,
          depositedUsd: positionData.valueUsd,
          projectedEarnings: positionData.projectedEarnings,
          projectedEarningsUsd:
            positionData.projectedEarningsUsd > 0 ? positionData.projectedEarningsUsd : null,
        } satisfies OpportunityTableRow;
      });
  }, [allOpportunities, opportunityIds, positionsMap]);

  const isLoading = opportunitiesLoading || positionsLoading;
  const error = opportunitiesError || positionsError;

  if (!isConnected) {
    return <YourHoldingsEmptyState />;
  }

  if (isLoading) {
    return <YourHoldingsPageSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded border-error bg-error/20 p-8 text-center">
        <p className="text-error">Failed to load positions: {error}</p>
      </div>
    );
  }

  if (opportunitiesWithPositions.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PortfolioSummaryCards
          opportunities={opportunitiesWithPositions}
          projectedEarningsUsd={projectedEarningsUsd}
          projectedEarningsMonthlyUsd={projectedEarningsMonthlyUsd}
          projectedEarningsYearlyPercentage={projectedEarningsYearlyPercentage}
          projectedEarningsMonthlyPercentage={projectedEarningsMonthlyPercentage}
          netApy={netApy}
          categoryApy={categoryApy}
          categoryValueByCategory={summary.byCategory}
          totalValueUsd={totalValueUsd}
        />
        <YourHoldingsEmptyState opportunities={allOpportunities} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PortfolioSummaryCards
        opportunities={opportunitiesWithPositions}
        projectedEarningsUsd={projectedEarningsUsd}
        projectedEarningsMonthlyUsd={projectedEarningsMonthlyUsd}
        projectedEarningsYearlyPercentage={projectedEarningsYearlyPercentage}
        projectedEarningsMonthlyPercentage={projectedEarningsMonthlyPercentage}
        netApy={netApy}
        categoryApy={categoryApy}
        categoryValueByCategory={summary.byCategory}
        totalValueUsd={totalValueUsd}
      />
      <OpportunitiesTable opportunities={opportunitiesWithPositions} groupByCategory={false} />
    </div>
  );
}
