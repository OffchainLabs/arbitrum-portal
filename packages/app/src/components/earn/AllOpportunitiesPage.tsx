'use client';

import { useMemo } from 'react';
import { useAccount } from 'wagmi';

import { useAllOpportunities } from '@/app-hooks/earn/useAllOpportunities';
import { useUserPositions } from '@/app-hooks/earn/useUserPositions';
import { OpportunityTableRow } from '@/app-types/earn/vaults';
import { ChainId } from '@/bridge/types/ChainId';

import { BestOpportunitiesShowcase } from './BestOpportunitiesShowcase';
import { MarketPageSkeleton } from './MarketPageSkeleton';
import { OpportunitiesTable } from './OpportunitiesTable';

export function AllOpportunitiesPage() {
  const { address, isConnected } = useAccount();

  const {
    opportunities: allOpportunities,
    isLoading: opportunitiesLoading,
    error: opportunitiesError,
  } = useAllOpportunities({ chainId: ChainId.ArbitrumOne, minTvl: 5_000_000 });

  const { positionsMap, isLoading: positionsLoading } = useUserPositions(
    isConnected ? (address ?? null) : null,
    [ChainId.ArbitrumOne],
  );

  const enrichedOpportunities = useMemo(() => {
    if (!isConnected || positionsMap.size === 0) {
      return allOpportunities;
    }

    return allOpportunities.map((opp) => {
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
        projectedEarningsUsd:
          positionData.projectedEarningsUsd > 0 ? positionData.projectedEarningsUsd : null,
      } satisfies OpportunityTableRow;
    });
  }, [allOpportunities, positionsMap, isConnected]);

  const isLoading = opportunitiesLoading || (isConnected ? positionsLoading : false);

  if (isLoading) {
    return <MarketPageSkeleton />;
  }

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
      <OpportunitiesTable opportunities={enrichedOpportunities} groupByCategory />
    </div>
  );
}
