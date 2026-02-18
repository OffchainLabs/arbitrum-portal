'use client';

import { useMemo } from 'react';
import { useAccount } from 'wagmi';

import { useAllOpportunities, useUserPositions } from '@/app-hooks/earn';
import { OpportunityTableRow } from '@/app-types/earn/vaults';

import { BestOpportunitiesShowcase } from './BestOpportunitiesShowcase';
import { MarketOpportunitiesTable } from './MarketOpportunitiesTable';
import { MarketPageSkeleton } from './MarketPageSkeleton';

/**
 * AllOpportunitiesPage - Displays all available opportunities
 *
 * When wallet is connected, enriches opportunities with user position data
 * so users can see their deposited amounts and earnings in the "All Markets" view.
 */
export function AllOpportunitiesPage() {
  const { address, isConnected } = useAccount();

  // Fetch all opportunities (base data)
  const {
    opportunities: allOpportunities,
    isLoading: opportunitiesLoading,
    error: opportunitiesError,
  } = useAllOpportunities({ minTvl: 5_000_000 });

  // Fetch user positions if wallet is connected (for enriching opportunities)
  const { positionsMap, isLoading: positionsLoading } = useUserPositions(
    isConnected ? (address ?? null) : null,
    ['arbitrum'],
  );

  // Enrich opportunities with position data when wallet is connected
  const enrichedOpportunities = useMemo(() => {
    if (!isConnected || positionsMap.size === 0) {
      // No wallet connected or no positions - return opportunities as-is
      return allOpportunities;
    }

    // Merge position data onto opportunities (don't filter - show all opportunities)
    return allOpportunities.map((opp) => {
      const oppId = opp.id.toLowerCase();
      const vaultAddress = opp.vaultAddress?.toLowerCase();

      // Get position data if user has a position in this opportunity
      const positionData =
        positionsMap.get(oppId) || (vaultAddress ? positionsMap.get(vaultAddress) : undefined);

      if (!positionData) {
        // No position - return opportunity as-is (with default "-" for deposited/earnings)
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
  }, [allOpportunities, positionsMap, isConnected]);

  const isLoading = opportunitiesLoading || (isConnected ? positionsLoading : false);

  // Loading state
  if (isLoading) {
    return <MarketPageSkeleton />;
  }

  // Error state
  if (opportunitiesError) {
    return (
      <div className="rounded border-error bg-error/20 p-8 text-center">
        <p className="text-error">Failed to load opportunities: {opportunitiesError}</p>
      </div>
    );
  }

  if (enrichedOpportunities.length === 0) {
    return (
      <div className="rounded border border-neutral-200 bg-neutral-50 p-8 text-center">
        <p className="text-gray-5">No opportunities available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <BestOpportunitiesShowcase opportunities={enrichedOpportunities} />
      <MarketOpportunitiesTable opportunities={enrichedOpportunities} />
    </div>
  );
}
