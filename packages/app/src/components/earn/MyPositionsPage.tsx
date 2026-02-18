'use client';

import { useMemo } from 'react';
import { useAccount } from 'wagmi';

import { useAllOpportunities, useUserPositions } from '@/app-hooks/earn';
import { OpportunityTableRow } from '@/app-types/earn/vaults';

import { OpportunitiesTable } from './MarketOpportunitiesTable';
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
  const { address, isConnected } = useAccount();

  // Fetch all opportunities (base data)
  const {
    opportunities: allOpportunities,
    isLoading: opportunitiesLoading,
    error: opportunitiesError,
  } = useAllOpportunities({ minTvl: 5000000 });

  // Fetch user positions (position-specific data to merge)
  const {
    positionsMap,
    opportunityIds,
    estimatedEarningsUsdNumber,
    estimatedEarningsMonthlyUsdNumber,
    estimatedEarningsYearlyPercentage,
    estimatedEarningsMonthlyPercentage,
    netApy,
    categoryApy,
    totalValueUsdNumber,
    isLoading: positionsLoading,
    error: positionsError,
  } = useUserPositions(address || null, ['arbitrum']);

  // Merge opportunities with position data
  // Filter to only opportunities where user has positions
  const opportunitiesWithPositions = useMemo(() => {
    return allOpportunities
      .filter((opp) => {
        // Match by opportunity ID (case-insensitive)
        // For vaults: opp.id is vault address, opp.vaultAddress is also vault address
        // For Pendle: opp.id is market address
        // For LiFi: opp.id is token address (wstETH, weETH)
        const oppId = opp.id.toLowerCase();
        const vaultAddress = opp.vaultAddress?.toLowerCase();

        // Check if this opportunity has a position
        return opportunityIds.has(oppId) || (vaultAddress && opportunityIds.has(vaultAddress));
      })
      .map((opp) => {
        // Find position data by opportunity ID or vault address
        const oppId = opp.id.toLowerCase();
        const vaultAddress = opp.vaultAddress?.toLowerCase();

        // Get position data (should always exist due to filter above)
        const positionData =
          positionsMap.get(oppId) || (vaultAddress ? positionsMap.get(vaultAddress) : undefined);

        if (!positionData) {
          // Should not happen due to filter above, but safe fallback
          return opp;
        }

        // Merge position data onto opportunity
        return {
          ...opp,
          deposited: positionData.deposited,
          depositedUsd: positionData.depositedUsd,
          earnings: positionData.earnings,
          earningsUsd: positionData.earningsUsd,
        } satisfies OpportunityTableRow;
      });
  }, [allOpportunities, opportunityIds, positionsMap]);

  const isLoading = opportunitiesLoading || positionsLoading;
  const error = opportunitiesError || positionsError;

  // Not connected state
  if (!isConnected) {
    return (
      <div className="rounded border border-neutral-200 bg-neutral-50 p-8 text-center">
        <p className="text-gray-5">Connect your wallet to see your positions.</p>
      </div>
    );
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
          estimatedEarningsUsdNumber={estimatedEarningsUsdNumber}
          estimatedEarningsMonthlyUsdNumber={estimatedEarningsMonthlyUsdNumber}
          estimatedEarningsYearlyPercentage={estimatedEarningsYearlyPercentage}
          estimatedEarningsMonthlyPercentage={estimatedEarningsMonthlyPercentage}
          netApy={netApy}
          categoryApy={categoryApy}
          totalValueUsdNumber={totalValueUsdNumber}
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
        estimatedEarningsUsdNumber={estimatedEarningsUsdNumber}
        estimatedEarningsMonthlyUsdNumber={estimatedEarningsMonthlyUsdNumber}
        estimatedEarningsYearlyPercentage={estimatedEarningsYearlyPercentage}
        estimatedEarningsMonthlyPercentage={estimatedEarningsMonthlyPercentage}
        netApy={netApy}
        categoryApy={categoryApy}
        totalValueUsdNumber={totalValueUsdNumber}
      />
      <OpportunitiesTable opportunities={opportunitiesWithPositions} groupByCategory={false} />
    </div>
  );
}
