import { useMemo } from 'react';

import { OpportunityTableRow } from '@/app-types/earn/vaults';

interface PortfolioMetrics {
  totalValue: number;
  totalEarnings: number;
  netApy: number;
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

    const earningsPercentChange = totalValue > 0 ? (totalEarnings / totalValue) * 100 : 0;

    return {
      totalValue,
      totalEarnings,
      netApy: calculatedNetApy,
      earningsPercentChange,
    };
  }, [opportunities, projectedEarningsUsdNumber, netApy]);
}
