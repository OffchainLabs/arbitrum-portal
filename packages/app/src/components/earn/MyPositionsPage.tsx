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

/**
 * MyPositionsPage - Displays user's positions across all vendors
 *
 * Uses useAllOpportunities as the base and enriches with position data from useUserPositions.
 * This ensures consistency between the "All Markets" and "Your Holdings" views.
 */
export function MyPositionsPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  // Redirect when the user explicitly disconnects while on this page
  useAccountEffect({
    onDisconnect() {
      router.replace('/earn/market');
    },
  });

  // Fetch all opportunities (base data)
  const {
    opportunities: allOpportunities,
    isLoading: opportunitiesLoading,
    error: opportunitiesError,
  } = useAllOpportunities({ minTvl: 5_000_000 });

  // Fetch user positions (position-specific data to merge)
  const {
    positionsMap,
    opportunityIds,
    estimatedEarningsUsd,
    estimatedEarningsMonthlyUsd,
    estimatedEarningsYearlyPercentage,
    estimatedEarningsMonthlyPercentage,
    netApy,
    categoryApy,
    totalValueUsd,
    isLoading: positionsLoading,
    error: positionsError,
  } = useUserPositions(address || null, ['arbitrum']);

  // Merge opportunities with position data
  // Filter to only opportunities where user has positions
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
          // Should not happen due to filter above, but safe fallback
          return opp;
        }

        return {
          ...opp,
          deposited: positionData.deposited,
          depositedUsd: positionData.valueUsd,
          earnings: positionData.earnings,
          earningsUsd:
            positionData.estimatedEarningsUsd > 0 ? positionData.estimatedEarningsUsd : null,
        } satisfies OpportunityTableRow;
      });
  }, [allOpportunities, opportunityIds, positionsMap]);

  const isLoading = opportunitiesLoading || positionsLoading;
  const error = opportunitiesError || positionsError;

  if (!isConnected) {
    return <YourHoldingsEmptyState />;
  }

  // Loading state
  if (isLoading) {
    return <YourHoldingsPageSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="rounded border-error bg-error/20 p-8 text-center">
        <p className="text-error">Failed to load positions: {error}</p>
      </div>
    );
  }

  // Empty state
  if (opportunitiesWithPositions.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PortfolioSummaryCards
          opportunities={opportunitiesWithPositions}
          estimatedEarningsUsd={estimatedEarningsUsd}
          estimatedEarningsMonthlyUsd={estimatedEarningsMonthlyUsd}
          estimatedEarningsYearlyPercentage={estimatedEarningsYearlyPercentage}
          estimatedEarningsMonthlyPercentage={estimatedEarningsMonthlyPercentage}
          netApy={netApy}
          categoryApy={categoryApy}
          totalValueUsd={totalValueUsd}
        />
        <YourHoldingsEmptyState opportunities={allOpportunities} />
      </div>
    );
  }

  // Show positions table with summary cards
  return (
    <div className="flex flex-col gap-6">
      <PortfolioSummaryCards
        opportunities={opportunitiesWithPositions}
        estimatedEarningsUsd={estimatedEarningsUsd}
        estimatedEarningsMonthlyUsd={estimatedEarningsMonthlyUsd}
        estimatedEarningsYearlyPercentage={estimatedEarningsYearlyPercentage}
        estimatedEarningsMonthlyPercentage={estimatedEarningsMonthlyPercentage}
        netApy={netApy}
        categoryApy={categoryApy}
        totalValueUsd={totalValueUsd}
      />
      <OpportunitiesTable opportunities={opportunitiesWithPositions} groupByCategory={false} />
    </div>
  );
}
