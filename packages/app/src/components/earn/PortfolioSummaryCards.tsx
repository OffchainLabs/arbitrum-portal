'use client';

import { InformationCircleIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { Tooltip } from '@/app-components/Tooltip';
import { usePortfolioMetrics } from '@/app-hooks/earn/usePortfolioMetrics';
import {
  CATEGORY_INDICATOR_CLASS,
  OpportunityCategory,
  OpportunityTableRow,
  getCategoryDisplayName,
} from '@/app-types/earn/vaults';
import { formatUSD } from '@/bridge/util/NumberUtils';

function formatPercentage(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

const CATEGORY_ORDER: OpportunityCategory[] = [
  OpportunityCategory.Lend,
  OpportunityCategory.LiquidStaking,
  OpportunityCategory.FixedYield,
];

const EMPTY_CATEGORY_VALUE: Record<OpportunityCategory, number> = {
  [OpportunityCategory.Lend]: 0,
  [OpportunityCategory.LiquidStaking]: 0,
  [OpportunityCategory.FixedYield]: 0,
};

interface PortfolioSummaryCardsProps {
  opportunities: OpportunityTableRow[];
  projectedEarningsUsd?: number;
  projectedEarningsMonthlyUsd?: number;
  projectedEarningsYearlyPercentage?: number;
  projectedEarningsMonthlyPercentage?: number;
  netApy?: number;
  categoryApy?: Partial<Record<OpportunityCategory, number>>;
  categoryValueByCategory?: Partial<
    Record<OpportunityCategory, { count: number; valueUsd: number }>
  >;
  totalValueUsd?: number;
}

type EarningsTimeframe = 'month' | 'year';

export function PortfolioSummaryCards({
  opportunities,
  projectedEarningsUsd,
  projectedEarningsMonthlyUsd,
  projectedEarningsYearlyPercentage,
  projectedEarningsMonthlyPercentage,
  netApy,
  categoryApy,
  categoryValueByCategory,
  totalValueUsd,
}: PortfolioSummaryCardsProps) {
  const [earningsTimeframe, setEarningsTimeframe] = useState<EarningsTimeframe>('year');
  const summary = usePortfolioMetrics(opportunities, projectedEarningsUsd, netApy);

  const valueByCategory = categoryValueByCategory
    ? {
        [OpportunityCategory.Lend]:
          categoryValueByCategory[OpportunityCategory.Lend]?.valueUsd ?? 0,
        [OpportunityCategory.LiquidStaking]:
          categoryValueByCategory[OpportunityCategory.LiquidStaking]?.valueUsd ?? 0,
        [OpportunityCategory.FixedYield]:
          categoryValueByCategory[OpportunityCategory.FixedYield]?.valueUsd ?? 0,
      }
    : opportunities.reduce(
        (acc, opportunity) => {
          acc[opportunity.category] += opportunity.depositedUsd ?? 0;
          return acc;
        },
        { ...EMPTY_CATEGORY_VALUE },
      );

  const activeCategories = CATEGORY_ORDER.filter((category) => valueByCategory[category] > 0);
  const totalValue = totalValueUsd !== undefined ? totalValueUsd : summary.totalValue;

  const displayEarnings =
    earningsTimeframe === 'month'
      ? (projectedEarningsMonthlyUsd ?? (summary.totalEarnings || 0) / 12)
      : (projectedEarningsUsd ?? (summary.totalEarnings || 0));

  const earningsPercentage =
    earningsTimeframe === 'month'
      ? (projectedEarningsMonthlyPercentage ?? 0)
      : (projectedEarningsYearlyPercentage ?? 0);

  const getTargetDate = () => {
    const targetDate =
      earningsTimeframe === 'month' ? dayjs().add(1, 'month') : dayjs().add(1, 'year');
    return targetDate.format('D MMM YYYY');
  };
  const totalValueForProgress = totalValue || 1;
  const categoryWidths = activeCategories.map((category) => ({
    category,
    width: (valueByCategory[category] / totalValueForProgress) * 100,
  }));

  return (
    <div className="flex flex-col lg:flex-row gap-4">
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
            <div className="flex h-full w-full">
              {categoryWidths.map(({ category, width }) => (
                <div
                  key={category}
                  className={twMerge('h-full', CATEGORY_INDICATOR_CLASS[category])}
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            {activeCategories.map((category) => {
              return (
                <div key={category} className="flex items-center gap-2">
                  <div
                    className={twMerge(
                      'w-2 h-2 rounded-full shrink-0',
                      CATEGORY_INDICATOR_CLASS[category],
                    )}
                  />
                  <p className="text-xs font-medium text-white opacity-80 whitespace-nowrap">
                    {getCategoryDisplayName(category)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex lg:flex-row flex-col gap-4 w-full lg:hidden">
        <div className="flex-1 bg-neutral-50 rounded px-4 py-6 flex flex-col gap-3 relative">
          <div className="flex flex-row justify-between items-center gap-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-white opacity-80">Projected Earnings</p>
              <Tooltip
                content={
                  <p className="text-xs text-white leading-relaxed">
                    Projected earnings are annualized estimates based on current APY rates. Actual
                    earnings may vary and are not guaranteed, as APY rates can change over time.
                  </p>
                }
                side="top"
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
              {formatUSD(displayEarnings)}
            </p>
            <p className="text-xs">
              {formatPercentage(earningsPercentage)} by {getTargetDate()}
            </p>
          </div>
        </div>

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
            {categoryApy && (
              <div className="flex flex-col gap-2 mt-2">
                {activeCategories.map((category) => {
                  const apy = categoryApy[category];
                  if (apy === undefined || !isFinite(apy)) return null;
                  return (
                    <div key={category} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={twMerge(
                            'w-2 h-2 rounded-full shrink-0',
                            CATEGORY_INDICATOR_CLASS[category],
                          )}
                        />
                        <p className="text-xs text-white opacity-80">
                          {getCategoryDisplayName(category)}
                        </p>
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

      <div className="hidden lg:flex lg:flex-1 bg-neutral-50 rounded px-4 py-6 flex-col gap-3 relative">
        <div className="flex flex-row justify-between items-center gap-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-white opacity-80">Projected Earnings</p>
            <Tooltip
              content={
                <p className="text-xs text-white leading-relaxed">
                  Projected earnings are annualized estimates based on current APY rates. Actual
                  earnings may vary and are not guaranteed, as APY rates can change over time.
                </p>
              }
              side="top"
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
            {formatUSD(displayEarnings)}
          </p>
          <p className="text-xs">
            {formatPercentage(earningsPercentage)} by {getTargetDate()}
          </p>
        </div>
      </div>

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
          {categoryApy && (
            <div className="flex flex-col gap-2 mt-2">
              {activeCategories.map((category) => {
                const apy = categoryApy[category];
                if (apy === undefined || !isFinite(apy)) return null;
                return (
                  <div key={category} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={twMerge(
                          'w-2 h-2 rounded-full shrink-0',
                          CATEGORY_INDICATOR_CLASS[category],
                        )}
                      />
                      <p className="text-xs text-white opacity-80">
                        {getCategoryDisplayName(category)}
                      </p>
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
