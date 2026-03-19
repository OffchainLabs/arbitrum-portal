import type {
  HistoricalDataRequestOptions,
  HistoricalGranularity,
  HistoricalTimeRange,
} from '../types';

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
const SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY;

function getRangeSpanSeconds(range: HistoricalTimeRange): number {
  switch (range) {
    case '1d':
      return SECONDS_PER_DAY;
    case '1m':
      return 30 * SECONDS_PER_DAY;
    case '1y':
      return 365 * SECONDS_PER_DAY;
    case '7d':
    default:
      return 7 * SECONDS_PER_DAY;
  }
}

export function getGranularityBucketSeconds(granularity: HistoricalGranularity): number {
  if (granularity === '1hour') {
    return SECONDS_PER_HOUR;
  }
  if (granularity === '1week') {
    return SECONDS_PER_WEEK;
  }
  return SECONDS_PER_DAY;
}

export function alignTimestampToGranularity(
  timestamp: number,
  granularity: HistoricalGranularity,
): number {
  const bucketSeconds = getGranularityBucketSeconds(granularity);
  return Math.floor(timestamp / bucketSeconds) * bucketSeconds;
}

export function deriveGranularityFromWindow(
  fromTimestamp: number,
  toTimestamp: number,
): HistoricalGranularity {
  const spanSeconds = Math.max(0, toTimestamp - fromTimestamp);
  if (spanSeconds <= 2 * SECONDS_PER_DAY) {
    return '1hour';
  }
  if (spanSeconds <= 120 * SECONDS_PER_DAY) {
    return '1day';
  }
  return '1week';
}

export function deriveRangeFromWindow(
  fromTimestamp: number,
  toTimestamp: number,
): HistoricalTimeRange {
  const spanSeconds = Math.max(0, toTimestamp - fromTimestamp);
  if (spanSeconds <= 2 * SECONDS_PER_DAY) {
    return '1d';
  }
  if (spanSeconds <= 10 * SECONDS_PER_DAY) {
    return '7d';
  }
  if (spanSeconds <= 45 * SECONDS_PER_DAY) {
    return '1m';
  }
  return '1y';
}

export function buildWindowFromRange(params: {
  range: HistoricalTimeRange;
  nowTimestamp?: number;
}): { fromTimestamp: number; toTimestamp: number; granularity: HistoricalGranularity } {
  const nowTimestamp = params.nowTimestamp ?? Math.floor(Date.now() / 1000);
  const range = params.range;
  const granularity: HistoricalGranularity =
    range === '1d' ? '1hour' : range === '1y' ? '1week' : '1day';
  const bucketSeconds = getGranularityBucketSeconds(granularity);
  const toTimestamp = Math.floor(nowTimestamp / bucketSeconds) * bucketSeconds;
  const fromTimestamp = toTimestamp - getRangeSpanSeconds(range);
  return { fromTimestamp, toTimestamp, granularity };
}

/**
 * Resolve the historical window for an adapter call.
 * Uses explicit options when provided, otherwise falls back to range-based defaults.
 */
export function resolveAdapterWindow(
  range: HistoricalTimeRange,
  options?: HistoricalDataRequestOptions,
): {
  fromTimestamp: number;
  toTimestamp: number;
  granularity: HistoricalGranularity;
  resolvedRange: HistoricalTimeRange;
} {
  const resolvedRange = options?.resolvedRange ?? range;

  if (options?.fromTimestamp !== undefined && options?.granularity) {
    const nowTimestamp = Math.floor(Date.now() / 1000);
    return {
      fromTimestamp: options.fromTimestamp,
      toTimestamp: options.toTimestamp ?? nowTimestamp,
      granularity: options.granularity,
      resolvedRange,
    };
  }

  const window = buildWindowFromRange({ range: resolvedRange });
  return { ...window, resolvedRange };
}

export function getSuggestedCacheTtlSeconds(granularity: HistoricalGranularity): number {
  if (granularity === '1hour') {
    return SECONDS_PER_HOUR;
  }
  if (granularity === '1day') {
    return 6 * SECONDS_PER_HOUR;
  }
  return SECONDS_PER_DAY;
}
