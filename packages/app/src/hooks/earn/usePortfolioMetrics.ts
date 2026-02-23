import { useMemo } from 'react';

import { OpportunityTableRow, getCategoryDisplayName } from '@/app-types/earn/vaults';

interface PortfolioMetrics {
  totalValue: number;
  totalEarnings: number;
  netApy: number;
  activePositions: number;
  positionsByType: { Lending: number };
  valueByType: { Lending: number };
  earningsPercentChange?: number;
}

export function usePortfolioMetrics(
  opportunities: OpportunityTableRow[],
  projectedEarningsUsdNumber?: number,
  netApy?: number,
): PortfolioMetrics {
  return useMemo(() => {
    if (opportunities.length === 0) {
      return {
        totalValue: 0,
        totalEarnings: 0,
        netApy: 0,
        activePositions: 0,
        positionsByType: { Lending: 0 },
        valueByType: { Lending: 0 },
        earningsPercentChange: 0,
      };
    }

    const totalValue = opportunities.reduce((sum, opp) => sum + (opp.depositedUsd ?? 0), 0);

    const totalEarnings =
      projectedEarningsUsdNumber !== undefined
        ? projectedEarningsUsdNumber
        : opportunities.reduce((sum, opp) => sum + (opp.projectedEarningsUsd ?? 0), 0);

    const calculatedNetApy =
      netApy ??
      (() => {
        const weightedApySum = opportunities.reduce(
          (sum, opp) => sum + (opp.rawApy ?? 0) * (opp.depositedUsd ?? 0),
          0,
        );
        return totalValue > 0 ? weightedApySum / totalValue : 0;
      })();

    const positionsByType = opportunities.reduce(
      (acc, opp) => {
        const displayName = getCategoryDisplayName(opp.category);
        acc.Lending = (acc.Lending || 0) + (displayName === 'Lending' ? 1 : 0);
        return acc;
      },
      { Lending: 0 },
    );

    const valueByType = opportunities.reduce(
      (acc, opp) => {
        const depositedUsd = opp.depositedUsd ?? 0;
        const displayName = getCategoryDisplayName(opp.category);
        if (displayName === 'Lending') acc.Lending = (acc.Lending || 0) + depositedUsd;
        return acc;
      },
      { Lending: 0 },
    );

    const earningsPercentChange = totalValue > 0 ? (totalEarnings / totalValue) * 100 : 0;

    return {
      totalValue,
      totalEarnings,
      netApy: calculatedNetApy,
      activePositions: opportunities.length,
      positionsByType,
      valueByType,
      earningsPercentChange,
    };
  }, [opportunities, projectedEarningsUsdNumber, netApy]);
}
