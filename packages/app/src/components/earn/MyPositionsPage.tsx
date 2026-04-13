'use client';

import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useAccount, useAccountEffect } from 'wagmi';

import { useAllOpportunities } from '@/app-hooks/earn/useAllOpportunities';
import { useUserPositions } from '@/app-hooks/earn/useUserPositions';
import { PENDLE_LOGO_URL } from '@/app-lib/earn/constants';
import { OpportunityTableRow } from '@/app-types/earn/vaults';
import { ChainId } from '@/bridge/types/ChainId';
import { formatCompactUsd, formatPercentage } from '@/bridge/util/NumberUtils';

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
  } = useAllOpportunities({ chainId: ChainId.ArbitrumOne, minTvl: 5_000_000 });

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
  } = useUserPositions(address, [ChainId.ArbitrumOne]);

  const opportunitiesWithPositions = useMemo(() => {
    const matched = allOpportunities
      .filter((opp) => {
        const opportunityId = opp.id.toLowerCase();
        const vaultAddress = opp.vaultAddress?.toLowerCase();
        return (
          opportunityIds.has(opportunityId) ||
          (vaultAddress !== undefined && opportunityIds.has(vaultAddress))
        );
      })
      .map((opp) => {
        const opportunityId = opp.id.toLowerCase();
        const vaultAddress = opp.vaultAddress?.toLowerCase();
        const positionData =
          positionsMap.get(opportunityId) ||
          (vaultAddress ? positionsMap.get(vaultAddress) : undefined);

        if (!positionData) {
          return opp;
        }

        return {
          ...opp,
          deposited: positionData.deposited,
          depositedUsd: positionData.valueUsd,
          projectedEarningsUsd: positionData.projectedEarningsUsd || null,
        } satisfies OpportunityTableRow;
      });

    // Synthesize rows for positions without matching opportunities (e.g. expired/matured markets)
    const matchedIds = new Set(matched.map((opp) => opp.id.toLowerCase()));
    for (const [oppId, positionData] of positionsMap) {
      if (matchedIds.has(oppId) || !positionData.opportunityName) {
        continue;
      }

      const rawApy = positionData.opportunityApy ?? 0;
      const rawTvl = positionData.opportunityTvl ?? null;
      const protocol = positionData.opportunityProtocol ?? '';

      matched.push({
        id: oppId,
        chainId: ChainId.ArbitrumOne,
        name: positionData.opportunityName,
        category: positionData.category,
        token: positionData.tokenSymbol,
        tokenIcon: positionData.tokenIcon || '',
        tokenNetwork: 'arbitrum',
        apy: rawApy > 0 ? formatPercentage(rawApy) : '—',
        tvl: rawTvl != null ? formatCompactUsd(rawTvl) : '—',
        protocol,
        protocolIcon: protocol === 'Pendle' ? PENDLE_LOGO_URL : '',
        vaultAddress: oppId,
        rawApy,
        rawTvl,
        deposited: positionData.deposited,
        depositedUsd: positionData.valueUsd,
        projectedEarningsUsd: positionData.projectedEarningsUsd || null,
        maturityDate: positionData.expiryDate
          ? dayjs(positionData.expiryDate).format('D MMM YYYY')
          : undefined,
      } satisfies OpportunityTableRow);
    }

    return matched;
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
    return <YourHoldingsEmptyState opportunities={allOpportunities} />;
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
