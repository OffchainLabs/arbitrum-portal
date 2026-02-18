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

/**
 * Hook to calculate portfolio metrics from user opportunities
 * If API-provided estimatedEarningsUsdNumber and netApy are provided, they will be used instead of calculating
 */
export function usePortfolioMetrics(
  opportunities: OpportunityTableRow[],
  estimatedEarningsUsdNumber?: number,
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

    // Helper function to safely parse USD strings (handles '-', empty strings, and formatted values)
    const parseUsdString = (usdString: string): number => {
      if (!usdString || usdString === '-') return 0;
      const cleaned = usdString.replace(/[$,]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Calculate total value from deposited USD amounts
    const totalValue = opportunities.reduce((sum, opp) => {
      const depositedUsd = parseUsdString(opp.depositedUsd);
      return sum + depositedUsd;
    }, 0);

    // Use API-provided estimated earnings if available, otherwise calculate from opportunities
    const totalEarnings =
      estimatedEarningsUsdNumber !== undefined
        ? estimatedEarningsUsdNumber
        : opportunities.reduce((sum, opp) => {
            const earningsUsd = parseUsdString(opp.earningsUsd);
            return sum + earningsUsd;
          }, 0);

    // Use API-provided net APY if available, otherwise calculate weighted average APY
    const calculatedNetApy =
      netApy !== undefined
        ? netApy
        : (() => {
            const weightedApySum = opportunities.reduce((sum, opp) => {
              const depositedUsd = parseUsdString(opp.depositedUsd);
              return sum + opp.rawApy * depositedUsd;
            }, 0);
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
        const depositedUsd = parseUsdString(opp.depositedUsd);
        const displayName = getCategoryDisplayName(opp.category);
        if (displayName === 'Lending') acc.Lending = (acc.Lending || 0) + depositedUsd;
        return acc;
      },
      { Lending: 0 },
    );

    // Calculate earnings percent change (simplified - can be enhanced with historical data)
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
  }, [opportunities, estimatedEarningsUsdNumber, netApy]);
}
