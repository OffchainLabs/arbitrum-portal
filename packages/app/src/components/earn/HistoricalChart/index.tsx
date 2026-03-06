'use client';

import { usePostHog } from 'posthog-js/react';
import { useMemo, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { useHistoricalData } from '@/app-hooks/earn/useHistoricalData';
import { ChainId } from '@/bridge/types/ChainId';
import { formatCompactUsd } from '@/bridge/util/NumberUtils';
import { Card } from '@/components/Card';
import type { EarnChainId, HistoricalTimeRange, OpportunityCategory } from '@/earn-api/types';

import { SwrLocalStorageCacheProvider } from '../../../app/SwrLocalStorageCacheProvider';
import { HistoricalLineChart } from './HistoricalLineChart';
import { CHART_CONFIG } from './chartConfig';
import { formatPriceUsd } from './formatters';

export interface HistoricalChartProps {
  opportunityId: string;
  category: OpportunityCategory;
  chainId?: EarnChainId;
  title?: string;
  assetSymbol?: string;
}

type MetricKey = 'apy' | 'tvl' | 'price';

const ALL_METRICS: MetricKey[] = ['price', 'apy', 'tvl'];
const METRIC_LABELS: Record<MetricKey, string> = {
  price: 'Token Price',
  apy: 'APY',
  tvl: 'TVL',
};
const RANGE_OPTIONS: Array<{ id: HistoricalTimeRange; label: string }> = [
  { id: '1d', label: '1D' },
  { id: '7d', label: '7D' },
  { id: '1m', label: '1M' },
  { id: '1y', label: '1Y' },
];

function getMetricsWithData(
  data: Array<{ apy: number | null; tvl: number | null; price: number | null }>,
): MetricKey[] {
  const hasApy = data.some((d) => d.apy !== null);
  const hasTvl = data.some((d) => d.tvl !== null);
  const hasPrice = data.some((d) => d.price !== null);
  return ALL_METRICS.filter((mk) => {
    if (mk === 'apy') return hasApy;
    if (mk === 'tvl') return hasTvl;
    return hasPrice;
  });
}

function computeCurrentMetricValue(
  chartData: Array<{ timestamp: number; value: number }>,
): { value: number; change: number | null } | null {
  if (!chartData.length) return null;
  const first = chartData[0];
  const latest = chartData[chartData.length - 1];
  if (!first || !latest) return null;

  if (first.value === 0) {
    return { value: latest.value, change: null };
  }

  const change = ((latest.value - first.value) / first.value) * 100;
  return { value: latest.value, change };
}

export function HistoricalChart(props: HistoricalChartProps) {
  return (
    <SwrLocalStorageCacheProvider>
      <HistoricalChartContent {...props} />
    </SwrLocalStorageCacheProvider>
  );
}

function HistoricalChartContent({
  opportunityId,
  category,
  chainId = ChainId.ArbitrumOne,
  title,
  assetSymbol,
}: HistoricalChartProps) {
  const posthog = usePostHog();
  const [metric, setMetric] = useState<MetricKey>('price');
  const [range, setRange] = useState<HistoricalTimeRange>('1d');
  const config = CHART_CONFIG[category];

  const { data, isLoading, error } = useHistoricalData({
    opportunityId,
    category,
    chainId,
    range,
    assetSymbol,
  });

  const availableMetrics = useMemo(
    () => (data?.data?.length ? getMetricsWithData(data.data) : []),
    [data?.data],
  );

  const activeMetric: MetricKey = availableMetrics.includes(metric)
    ? metric
    : (availableMetrics[0] ?? 'apy');

  const chartData = useMemo(() => {
    if (!data?.data) return [] as Array<{ timestamp: number; value: number }>;

    return data.data
      .filter((d) => {
        if (activeMetric === 'apy') return d.apy !== null;
        if (activeMetric === 'tvl') return d.tvl !== null;
        if (activeMetric === 'price') return d.price !== null;
        return false;
      })
      .map((d) => ({
        timestamp: d.timestamp,
        value:
          activeMetric === 'apy'
            ? (d.apy ?? 0)
            : activeMetric === 'tvl'
              ? (d.tvl ?? 0)
              : activeMetric === 'price'
                ? (d.price ?? 0)
                : 0,
      }));
  }, [data, activeMetric]);

  const currentValue = useMemo(() => computeCurrentMetricValue(chartData), [chartData]);
  const metricsToRender = availableMetrics.length > 0 ? availableMetrics : ALL_METRICS;
  const xFormat =
    data?.range === '1d' ? 'HH:mm' : data?.range === '1y' ? 'MMM D, YYYY' : config.dateFormat;

  const formatCurrentValue = (value: number): string => {
    if (activeMetric === 'apy') {
      return `${value.toFixed(2)}%`;
    }
    if (activeMetric === 'price') {
      return formatPriceUsd(value);
    }
    return formatCompactUsd(value);
  };

  const pillBase =
    'px-3 py-0.5 text-xs font-medium rounded-full transition-colors border-0 cursor-pointer text-center';
  const pillSelected = 'bg-white text-black';
  const pillUnselected = 'text-white hover:bg-white/10';

  return (
    <Card className="rounded bg-gray-1 p-4">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:flex-nowrap md:items-start md:justify-between md:gap-4">
        {(availableMetrics.length > 0 || isLoading) && (
          <div className="flex w-full md:w-auto md:shrink-0 items-center bg-white/5 rounded-[10px] p-[2px] gap-1 md:gap-2">
            {metricsToRender.map((mk) => (
              <button
                key={mk}
                type="button"
                className={twMerge(
                  pillBase,
                  'flex-1 md:flex-none',
                  activeMetric === mk ? pillSelected : pillUnselected,
                  isLoading ? 'opacity-60 cursor-default pointer-events-none' : '',
                )}
                disabled={isLoading}
                onClick={() => {
                  if (isLoading || activeMetric === mk) return;
                  setMetric(mk);
                  posthog?.capture('Earn Historical Chart Interacted', {
                    page: 'Earn',
                    section: 'Historical Chart',
                    interactionType: 'metric',
                    metric: mk,
                    range,
                    category,
                    opportunityId,
                    opportunityName: title,
                    assetSymbol,
                    chainId,
                  });
                }}
              >
                {METRIC_LABELS[mk]}
              </button>
            ))}
          </div>
        )}
        <div className="hidden md:flex w-[188px] items-center justify-between bg-white/5 rounded-[10px] p-[2px] gap-2 shrink-0">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={twMerge(
                pillBase,
                range === r.id ? pillSelected : pillUnselected,
                isLoading ? 'opacity-60 cursor-default pointer-events-none' : '',
              )}
              disabled={isLoading}
              onClick={() => {
                if (isLoading || range === r.id) return;
                setRange(r.id);
                posthog?.capture('Earn Historical Chart Interacted', {
                  page: 'Earn',
                  section: 'Historical Chart',
                  interactionType: 'range',
                  metric: activeMetric,
                  range: r.id,
                  category,
                  opportunityId,
                  opportunityName: title,
                  assetSymbol,
                  chainId,
                });
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {(currentValue || isLoading) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="text-2xl font-bold text-white">
            {currentValue && !isLoading ? (
              formatCurrentValue(currentValue.value)
            ) : (
              <div className="h-7 w-24 rounded bg-white/20" />
            )}
          </div>
          {currentValue && currentValue.change !== null && !isLoading && (
            <div
              className={`mt-1 rounded px-2 py-1 text-xs font-medium ${
                currentValue.change >= 0
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-red-500/10 text-red-500'
              }`}
            >
              {currentValue.change >= 0 ? '+' : ''}
              {currentValue.change.toFixed(2)}%
            </div>
          )}
        </div>
      )}

      <div className="w-full min-h-[200px] rounded h-64 flex items-center justify-center bg-transparent">
        {isLoading && (
          <div className="w-full h-full animate-pulse" aria-hidden>
            <div className="flex h-full flex-col gap-2 md:hidden">
              <div className="flex-1 rounded bg-white/10" />
              <div className="grid grid-cols-4 gap-1 px-1">
                <div className="h-3 rounded bg-white/20" />
                <div className="h-3 rounded bg-white/20" />
                <div className="h-3 rounded bg-white/20" />
                <div className="h-3 rounded bg-white/20" />
              </div>
            </div>
            <div className="hidden h-full flex-col gap-2 md:flex">
              <div className="flex flex-1 min-h-0 gap-3">
                <div className="flex flex-col justify-between py-1 shrink-0">
                  <div className="h-3 w-8 rounded bg-white/20" />
                  <div className="h-3 w-8 rounded bg-white/20" />
                  <div className="h-3 w-8 rounded bg-white/20" />
                  <div className="h-3 w-8 rounded bg-white/20" />
                  <div className="h-3 w-8 rounded bg-white/20" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col opacity-20">
                  <svg
                    viewBox="0 0 400 160"
                    className="w-full flex-1 min-h-0"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="chartShimmerGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(255 255 255 / 0.2)" />
                        <stop offset="100%" stopColor="rgb(255 255 255 / 0.06)" />
                      </linearGradient>
                    </defs>
                    <line
                      x1="0"
                      y1="40"
                      x2="400"
                      y2="40"
                      stroke="rgb(255 255 255 / 0.12)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <line
                      x1="0"
                      y1="80"
                      x2="400"
                      y2="80"
                      stroke="rgb(255 255 255 / 0.12)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <line
                      x1="0"
                      y1="120"
                      x2="400"
                      y2="120"
                      stroke="rgb(255 255 255 / 0.12)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <path
                      d="M 0 120 Q 50 140, 100 100 T 200 80 T 300 60 T 400 90 L 400 160 L 0 160 Z"
                      fill="url(#chartShimmerGradient)"
                    />
                    <path
                      d="M 0 120 Q 50 140, 100 100 T 200 80 T 300 60 T 400 90"
                      fill="none"
                      stroke="rgb(255 255 255 / 0.28)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <div className="flex justify-between gap-1 shrink-0 px-1">
                <div className="h-3 w-10 rounded bg-white/20" />
                <div className="h-3 w-10 rounded bg-white/20" />
                <div className="h-3 w-10 rounded bg-white/20" />
                <div className="h-3 w-10 rounded bg-white/20" />
                <div className="h-3 w-10 rounded bg-white/20" />
                <div className="h-3 w-10 rounded bg-white/20" />
                <div className="h-3 w-10 rounded bg-white/20" />
              </div>
            </div>
          </div>
        )}
        {!isLoading && error && (
          <div className="text-red-400 text-xs">Failed to load chart: {error}</div>
        )}
        {!isLoading && !error && chartData.length > 0 && data && (
          <HistoricalLineChart
            data={chartData}
            config={config}
            metricType={activeMetric}
            xFormat={xFormat}
            xDomain={[data.fromTimestamp, data.toTimestamp]}
          />
        )}
        {!isLoading && !error && chartData.length === 0 && (
          <div className="text-gray-500 text-sm">No chart data available</div>
        )}
      </div>
      <div className="mt-3 flex md:hidden items-center bg-white/5 rounded-full p-1 gap-1">
        {RANGE_OPTIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={twMerge(
              pillBase,
              'flex-1',
              range === r.id ? pillSelected : pillUnselected,
              isLoading ? 'opacity-60 cursor-default pointer-events-none' : '',
            )}
            disabled={isLoading}
            onClick={() => {
              if (isLoading || range === r.id) return;
              setRange(r.id);
              posthog?.capture('Earn Historical Chart Interacted', {
                page: 'Earn',
                section: 'Historical Chart',
                interactionType: 'range',
                metric: activeMetric,
                range: r.id,
                category,
                opportunityId,
                opportunityName: title,
                assetSymbol,
                chainId,
              });
            }}
          >
            {r.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
