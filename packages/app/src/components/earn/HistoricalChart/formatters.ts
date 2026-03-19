import { formatCompactUsd } from '@/bridge/util/NumberUtils';

function getPriceMaximumFractionDigits(value: number): number {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return 2;
  }
  if (abs >= 1) {
    return 4;
  }
  return 6;
}

export function formatPriceUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: getPriceMaximumFractionDigits(value),
  }).format(value);
}

export type MetricType = 'apy' | 'tvl' | 'price';

export function formatMetricValue(metricType: MetricType | undefined, value: number): string {
  if (metricType === 'apy') {
    return `${value.toFixed(2)}%`;
  }

  if (metricType === 'price') {
    return formatPriceUsd(value);
  }

  return formatCompactUsd(value);
}

export const ALL_METRICS: MetricType[] = ['price', 'apy', 'tvl'];

export function getMetricsWithData(
  data: Array<{ apy: number | null; tvl: number | null; price: number | null }>,
): MetricType[] {
  const hasApy = data.some((d) => d.apy !== null);
  const hasTvl = data.some((d) => d.tvl !== null);
  const hasPrice = data.some((d) => d.price !== null);
  return ALL_METRICS.filter((mk) => {
    if (mk === 'apy') return hasApy;
    if (mk === 'tvl') return hasTvl;
    return hasPrice;
  });
}

export function computeCurrentMetricValue(
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
