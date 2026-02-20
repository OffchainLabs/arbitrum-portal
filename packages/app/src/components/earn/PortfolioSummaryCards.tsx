'use client';

import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

import { usePortfolioMetrics } from '@/app-hooks/earn';
import {
  CATEGORY_INDICATOR_CLASS,
  OpportunityCategory,
  OpportunityTableRow,
} from '@/app-types/earn/vaults';
import { Tooltip } from '@/bridge/components/common/Tooltip';
import { formatUSD } from '@/bridge/util/NumberUtils';

import { ChartPlaceholder } from './ChartPlaceholder';

function formatPercentage(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

const TYPE_ORDER: Array<{ type: 'Lending'; category: OpportunityCategory }> = [
  { type: 'Lending', category: OpportunityCategory.Lend },
];

interface PortfolioSummaryCardsProps {
  opportunities: OpportunityTableRow[];
  estimatedEarningsUsd?: number;
  estimatedEarningsMonthlyUsd?: number;
  estimatedEarningsYearlyPercentage?: number;
  estimatedEarningsMonthlyPercentage?: number;
  netApy?: number;
  categoryApy?: { lend: number };
  totalValueUsd?: number;
}

type EarningsTimeframe = 'month' | 'year';

export function PortfolioSummaryCards({
  opportunities,
  estimatedEarningsUsd,
  estimatedEarningsMonthlyUsd,
  estimatedEarningsYearlyPercentage,
  estimatedEarningsMonthlyPercentage,
  netApy,
  categoryApy,
  totalValueUsd,
}: PortfolioSummaryCardsProps) {
  const [earningsTimeframe, setEarningsTimeframe] = useState<EarningsTimeframe>('year');
  const summary = usePortfolioMetrics(opportunities, estimatedEarningsUsd, netApy);

  const totalValue = totalValueUsd !== undefined ? totalValueUsd : summary.totalValue;

  const displayEarnings =
    earningsTimeframe === 'month'
      ? (estimatedEarningsMonthlyUsd ?? (summary.totalEarnings || 0) / 12)
      : (estimatedEarningsUsd ?? (summary.totalEarnings || 0));

  // Use API-provided percentage values based on timeframe
  const earningsPercentage =
    earningsTimeframe === 'month'
      ? (estimatedEarningsMonthlyPercentage ?? 0)
      : (estimatedEarningsYearlyPercentage ?? 0);

  // Calculate target date based on timeframe
  const getTargetDate = () => {
    const now = new Date();
    const targetDate = new Date(now);

    if (earningsTimeframe === 'month') {
      targetDate.setMonth(targetDate.getMonth() + 1);
    } else {
      targetDate.setFullYear(targetDate.getFullYear() + 1);
    }

    return targetDate.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  const totalValueForProgress = totalValue || 1;
  const lendingWidth = (summary.valueByType.Lending / totalValueForProgress) * 100;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Your Holdings Card - Full width on mobile, flex-1 on desktop */}
      <div className="w-full lg:flex-1 bg-neutral-50 rounded px-4 py-6 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-white opacity-80">Current Holdings</p>
            <p className="text-xs text-white opacity-50">
              Total value of all your positions across all protocols
            </p>
          </div>
          <p className="text-[28px] font-medium text-white tracking-[-0.56px]">
            {formatUSD(totalValue)}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="relative h-2 bg-default-black-hover rounded-[5px] overflow-hidden w-full">
            {lendingWidth > 0 && (
              <div
                className="absolute h-2 bg-earn-lend left-0 top-0"
                style={{ width: `${lendingWidth}%` }}
              />
            )}
          </div>
          {/* Legend - matches progress bar order */}
          <div className="flex gap-3">
            {TYPE_ORDER.map(({ type, category }) => {
              const value = summary.valueByType[type];
              if (value === 0) return null;
              return (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-[5px] shrink-0 ${CATEGORY_INDICATOR_CLASS[category]}`}
                  />
                  <p className="text-xs font-medium text-white opacity-80 whitespace-nowrap">
                    {type}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Estimated Earnings and Net APY Cards - Side by side on mobile, separate on desktop */}
      <div className="flex lg:flex-row flex-col gap-4 w-full lg:hidden">
        {/* Estimated Earnings Card */}
        <div className="flex-1 bg-neutral-50 rounded px-4 py-6 flex flex-col gap-3 relative">
          <div className="flex flex-row justify-between items-center gap-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-white opacity-80">Estimated Earnings</p>
              <Tooltip
                content={
                  <div className="p-2 bg-neutral-100 rounded max-w-[200px]">
                    <p className="text-xs text-white leading-relaxed">
                      Estimated earnings are calculated using current APY rates. Actual earnings may
                      vary and are not guaranteed, as APY rates can change over time.
                    </p>
                  </div>
                }
                tippyProps={{ placement: 'top' }}
              >
                <div className="flex items-center justify-center cursor-pointer">
                  <InformationCircleIcon className="h-4 w-4 text-white opacity-50 hover:opacity-70" />
                </div>
              </Tooltip>
            </div>

            <div className="flex items-center bg-white/5 rounded-full p-0.5 gap-0.5">
              <button
                className={`px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors ${
                  earningsTimeframe === 'month'
                    ? 'bg-white text-black'
                    : 'text-white hover:bg-white/10'
                }`}
                onClick={() => setEarningsTimeframe('month')}
              >
                Month
              </button>
              <button
                className={`px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors ${
                  earningsTimeframe === 'year'
                    ? 'bg-white text-black'
                    : 'text-white hover:bg-white/10'
                }`}
                onClick={() => setEarningsTimeframe('year')}
              >
                Year
              </button>
            </div>
          </div>

          <p className="text-xs text-white opacity-50">
            Expected earnings if current holdings are maintained for the selected timeframe at the
            current APY.
          </p>
          <div className="flex flex-col gap-3">
            <p className="text-[28px] font-medium text-white tracking-[-0.56px]">
              +{formatUSD(displayEarnings)}
            </p>
            <p className="text-xs">
              {formatPercentage(earningsPercentage)} by {getTargetDate()}
            </p>
          </div>

          <div className="hidden lg:block">
            <ChartPlaceholder label="Estimated earnings" />
          </div>
        </div>

        {/* Average APY Card */}
        <div className="flex-1 bg-neutral-50 rounded px-4 py-6 flex flex-col justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-white opacity-80 whitespace-nowrap">
                Average APY
              </p>
              <p className="text-xs text-white opacity-50">Average APY across all your positions</p>
            </div>
            <p className="text-[28px] font-medium text-white tracking-[-0.56px] whitespace-nowrap">
              {formatPercentage(summary.netApy)}
            </p>
            {/* Category APY Breakdown */}
            {categoryApy && (
              <div className="flex flex-col gap-2 mt-2">
                {TYPE_ORDER.map(({ type, category }) => {
                  const apy = type === 'Lending' ? categoryApy.lend : undefined;
                  // Show if APY exists and is a valid number (even if 0, as long as there are positions)
                  if (apy === undefined || apy === null || !isFinite(apy)) return null;
                  return (
                    <div key={type} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded shrink-0 ${CATEGORY_INDICATOR_CLASS[category]}`}
                        />
                        <p className="text-xs text-white opacity-80">{type}</p>
                      </div>
                      <p className="text-xs font-medium text-white">{formatPercentage(apy)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: Estimated Earnings Card - Separate card */}
      <div className="hidden lg:flex lg:flex-1 bg-neutral-50 rounded px-4 py-6 flex-col gap-3 relative">
        <div className="flex flex-row justify-between items-center gap-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-white opacity-80">Estimated Earnings</p>
            <Tooltip
              content={
                <div className="p-2 bg-neutral-100 rounded max-w-[200px]">
                  <p className="text-xs text-white leading-relaxed">
                    Estimated earnings are calculated using current APY rates. Actual earnings may
                    vary and are not guaranteed, as APY rates can change over time.
                  </p>
                </div>
              }
              tippyProps={{ placement: 'top' }}
            >
              <div className="flex items-center justify-center cursor-pointer">
                <InformationCircleIcon className="h-4 w-4 text-white opacity-50 hover:opacity-70" />
              </div>
            </Tooltip>
          </div>

          <div className="flex items-center bg-white/5 rounded-full p-0.5 gap-0.5">
            <button
              className={`px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors ${
                earningsTimeframe === 'month'
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/10'
              }`}
              onClick={() => setEarningsTimeframe('month')}
            >
              Month
            </button>
            <button
              className={`px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors ${
                earningsTimeframe === 'year'
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/10'
              }`}
              onClick={() => setEarningsTimeframe('year')}
            >
              Year
            </button>
          </div>
        </div>

        <p className="text-xs text-white opacity-50">
          Expected earnings if current holdings are maintained for the selected timeframe at the
          current APY
        </p>
        <div className="flex flex-col gap-3">
          <p className="text-[28px] font-medium text-white tracking-[-0.56px]">
            +{formatUSD(displayEarnings)}
          </p>
          <p className="text-xs">
            {formatPercentage(earningsPercentage)} by {getTargetDate()}
          </p>
        </div>

        <ChartPlaceholder label="Estimated earnings" />
      </div>

      {/* Desktop: Average APY Card - Separate card */}
      <div className="hidden lg:flex lg:flex-1 bg-neutral-50 rounded px-4 py-6 flex-col justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-white opacity-80 whitespace-nowrap">
              Average APY
            </p>
            <p className="text-xs text-white opacity-50">Average APY across all your positions</p>
          </div>
          <p className="text-[28px] font-medium text-white tracking-[-0.56px] whitespace-nowrap">
            {formatPercentage(summary.netApy)}
          </p>
          {/* Category APY Breakdown */}
          {categoryApy && (
            <div className="flex flex-col gap-2 mt-2">
              {TYPE_ORDER.map(({ type, category }) => {
                const apy = type === 'Lending' ? categoryApy.lend : undefined;
                // Show if APY exists and is a valid number (even if 0, as long as there are positions)
                if (apy === undefined || apy === null || !isFinite(apy)) return null;
                return (
                  <div key={type} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded shrink-0 ${CATEGORY_INDICATOR_CLASS[category]}`}
                      />
                      <p className="text-xs text-white opacity-80">{type}</p>
                    </div>
                    <p className="text-xs font-medium text-white">{formatPercentage(apy)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
