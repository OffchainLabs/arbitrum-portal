'use client';

import { usePortfolioMetrics } from '../../hooks/earn';
import { OpportunityTableRow } from '../../types/vaults';

interface PortfolioSummaryCardsProps {
  opportunities: OpportunityTableRow[];
}

export function PortfolioSummaryCards({ opportunities }: PortfolioSummaryCardsProps) {
  const summary = usePortfolioMetrics(opportunities);

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Active Positions Card */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Active Positions</h3>
        </div>
        <div className="text-3xl font-bold text-white mb-2">{formatUSD(summary.totalValue)}</div>

        {/* Progress bar placeholder */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min((summary.totalValue / 1000) * 10, 100)}%` }}
          />
        </div>

        {/* Position type indicators */}
        <div className="flex space-x-4">
          {Object.entries(summary.positionsByType).map(([type, count]) => (
            <div key={type} className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${count > 0 ? 'bg-blue-500' : 'bg-gray-600'}`}
              />
              <span className="text-sm text-gray-400">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Total Earnings Card */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Total Earnings</h3>
        </div>
        <div className="text-3xl font-bold text-white mb-2">{formatUSD(summary.totalEarnings)}</div>
        <div className="text-sm text-green-400">
          {summary.totalEarnings > 0
            ? formatPercentage((summary.totalEarnings / summary.totalValue) * 100)
            : '+0%'}
        </div>
      </div>

      {/* Net APY Card */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Net APY</h3>
        </div>
        <div className="text-3xl font-bold text-white mb-2">{formatPercentage(summary.netApy)}</div>
        <div className="text-xs text-gray-500">Data provided by vaults.fyi</div>
      </div>
    </div>
  );
}
