'use client';

import dayjs from 'dayjs';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';

import { formatCompactUsd } from '@/bridge/util/NumberUtils';

import type { ChartConfig } from './chartConfig';
import { formatPriceUsd } from './formatters';

interface HistoricalLineChartProps {
  data: Array<{ timestamp: number; value: number }>;
  config: ChartConfig;
  metricType: 'apy' | 'tvl' | 'price';
  xFormat: string;
  xDomain?: [number, number];
}

type MetricType = 'apy' | 'tvl' | 'price';

function formatMetricValue(metricType: MetricType | undefined, value: number): string {
  if (metricType === 'apy') {
    return `${value.toFixed(2)}%`;
  }

  if (metricType === 'price') {
    return formatPriceUsd(value);
  }

  return formatCompactUsd(value);
}

interface ChartTooltipContentProps extends TooltipProps<number, string> {
  metricType?: MetricType;
  xFormat?: string;
  payload?: Array<{ name: string; value: number }>;
  label?: number | string;
}

function ChartTooltipContent(props: ChartTooltipContentProps) {
  const { active, payload, label: labelRaw, metricType, xFormat } = props;

  let label: string | undefined;
  if (typeof labelRaw === 'number' && xFormat) {
    label = dayjs.unix(labelRaw).format(xFormat);
  } else if (labelRaw !== undefined) {
    label = String(labelRaw);
  }

  if (!active || !payload || payload.length === 0) return null;
  const tooltipRows = payload.map((item, index) => ({
    key: `${item.name ?? 'metric'}-${index}`,
    name: item.name,
    value: formatMetricValue(metricType, Number(item.value ?? 0)),
  }));

  return (
    <div className="rounded-md border border-white/10 bg-gray-1 p-2 text-xs text-white shadow">
      {label && <div className="mb-1 text-white/70">{label}</div>}
      {tooltipRows.map((item) => (
        <div key={item.key} className="flex items-center justify-between gap-4">
          <span className="text-white/70">{item.name}</span>
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function HistoricalLineChart({
  data,
  config,
  metricType,
  xFormat,
  xDomain,
}: HistoricalLineChartProps) {
  const metricConfig = config[metricType];

  const getYAxisDomain = (): [number | string, number | string] => {
    if (data.length === 0) {
      return [0, 'auto'];
    }

    const values = data.map((d) => d.value).filter((v) => v !== null && !isNaN(v));
    if (values.length === 0) {
      return [0, 'auto'];
    }

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;

    if (range < 0.0001) {
      const center = minValue;
      const padding = center > 1 ? Math.max(center * 0.01, 0.01) : Math.max(center * 0.01, 0.001);
      return [center - padding, center + padding];
    }

    const padding = range * 0.5;
    const minPadding = range > 0.01 ? range * 0.05 : Math.max(range * 0.1, 0.001);
    const adjustedPadding = Math.max(padding, minPadding);
    return [minValue - adjustedPadding, maxValue + adjustedPadding];
  };

  const formatYAxisLabel = (value: number): string => {
    if (metricType === 'apy') {
      const abs = Math.abs(value);
      const decimals = abs < 1 ? 3 : 2;
      return `${value.toFixed(decimals)}%`;
    }
    if (metricType === 'price') {
      return formatPriceUsd(value);
    }
    return formatCompactUsd(value);
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} accessibilityLayer>
        <CartesianGrid
          strokeDasharray="4 4"
          stroke="rgba(255,255,255,0.12)"
          vertical={true}
          horizontal={true}
        />
        <XAxis
          type="number"
          domain={xDomain ?? ['dataMin', 'dataMax']}
          dataKey="timestamp"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          allowDecimals={false}
          allowDuplicatedCategory={false}
          tickFormatter={(value: number) => dayjs.unix(value).format(xFormat)}
          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
        />
        <YAxis
          domain={getYAxisDomain()}
          tickFormatter={formatYAxisLabel}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
          width={50}
        />
        <Tooltip content={<ChartTooltipContent metricType={metricType} xFormat={xFormat} />} />
        <Line
          type="monotone"
          dataKey="value"
          name={metricConfig.name}
          stroke="white"
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 4, fill: 'white' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
