import { useMemo } from 'react';

import { OpportunityTableRow } from '../../types/vaults';

interface PortfolioMetrics {
  totalValue: number;
  totalEarnings: number;
  netApy: number;
  activePositions: number;
  positionsByType: {
    'Fixed Yield': number;
    'Lend': number;
    'Liquid Staking': number;
  };
}

/**
 * Hook to calculate portfolio metrics from user opportunities
 */
export function usePortfolioMetrics(opportunities: OpportunityTableRow[]): PortfolioMetrics {
  return useMemo(() => {
    if (opportunities.length === 0) {
      return {
        totalValue: 0,
        totalEarnings: 0,
        netApy: 0,
        activePositions: 0,
        positionsByType: {
          'Fixed Yield': 0,
          'Lend': 0,
          'Liquid Staking': 0,
        },
      };
    }

    // Calculate total value from deposited USD amounts
    const totalValue = opportunities.reduce((sum, opp) => {
      const depositedUsd = parseFloat(opp.depositedUsd.replace(/[$,]/g, '') || '0');
      return sum + depositedUsd;
    }, 0);

    // Calculate total earnings from earnings USD amounts
    const totalEarnings = opportunities.reduce((sum, opp) => {
      const earningsUsd = parseFloat(opp.earningsUsd.replace(/[$,]/g, '') || '0');
      return sum + earningsUsd;
    }, 0);

    // Calculate weighted average APY
    const weightedApySum = opportunities.reduce((sum, opp) => {
      const depositedUsd = parseFloat(opp.depositedUsd.replace(/[$,]/g, '') || '0');
      return sum + opp.rawApy * depositedUsd;
    }, 0);

    const netApy = totalValue > 0 ? weightedApySum / totalValue : 0;

    // Count positions by type
    const positionsByType = opportunities.reduce(
      (acc, opp) => {
        acc[opp.type as keyof typeof acc] = (acc[opp.type as keyof typeof acc] || 0) + 1;
        return acc;
      },
      {
        'Fixed Yield': 0,
        'Lend': 0,
        'Liquid Staking': 0,
      },
    );

    return {
      totalValue,
      totalEarnings,
      netApy,
      activePositions: opportunities.length,
      positionsByType,
    };
  }, [opportunities]);
}
