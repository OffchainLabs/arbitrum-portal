'use client';

import useSWRImmutable from 'swr/immutable';

import { ChainId } from '@/bridge/types/ChainId';
import type {
  EarnChainId,
  HistoricalData,
  HistoricalTimeRange,
  OpportunityCategory,
} from '@/earn-api/types';
import { HISTORICAL_VENDOR_TTL_SECONDS } from '@/earn-api/types';

export interface UseHistoricalDataParams {
  opportunityId: string | null;
  category: OpportunityCategory;
  chainId?: EarnChainId;
  range: HistoricalTimeRange;
  assetSymbol?: string;
}

export interface UseHistoricalDataResult {
  data: HistoricalData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

const HISTORICAL_REVALIDATE_INTERVAL_MS = HISTORICAL_VENDOR_TTL_SECONDS * 1000;

function getRangeConfig(range: HistoricalTimeRange): {
  spanSeconds: number;
  bucketSeconds: number;
} {
  switch (range) {
    case '1d':
      return { spanSeconds: 24 * 3600, bucketSeconds: 3600 };
    case '1m':
      return { spanSeconds: 30 * 24 * 3600, bucketSeconds: 24 * 3600 };
    case '1y':
      return { spanSeconds: 365 * 24 * 3600, bucketSeconds: 7 * 24 * 3600 };
    case '7d':
    default:
      return { spanSeconds: 7 * 24 * 3600, bucketSeconds: 24 * 3600 };
  }
}

function buildHistoricalWindow(range: HistoricalTimeRange): {
  fromTimestamp: number;
  toTimestamp: number;
} {
  const nowTimestamp = Math.floor(Date.now() / 1000);
  const { spanSeconds, bucketSeconds } = getRangeConfig(range);
  const toTimestamp = Math.floor(nowTimestamp / bucketSeconds) * bucketSeconds;
  const fromTimestamp = toTimestamp - spanSeconds;
  return { fromTimestamp, toTimestamp };
}

export function useHistoricalData(params: UseHistoricalDataParams): UseHistoricalDataResult {
  const { opportunityId, category, chainId = ChainId.ArbitrumOne, range, assetSymbol } = params;
  const normalizedAssetSymbol = assetSymbol?.toLowerCase();
  const { fromTimestamp, toTimestamp } = buildHistoricalWindow(range);

  const { data, error, isLoading, mutate } = useSWRImmutable(
    opportunityId && category
      ? ([
          'historical-data',
          opportunityId,
          category,
          chainId,
          range,
          fromTimestamp,
          toTimestamp,
          normalizedAssetSymbol,
        ] as const)
      : null,
    async ([
      ,
      keyOpportunityId,
      keyCategory,
      keyChainId,
      keyRange,
      keyFromTimestamp,
      keyToTimestamp,
      keyAssetSymbol,
    ]) => {
      const queryParams = new URLSearchParams();
      queryParams.set('chainId', String(keyChainId));
      queryParams.set('range', keyRange);
      queryParams.set('from', String(keyFromTimestamp));
      queryParams.set('to', String(keyToTimestamp));
      if (keyAssetSymbol) {
        queryParams.set('assetSymbol', keyAssetSymbol);
      }

      const queryString = queryParams.toString();

      const response = await fetch(
        `/api/onchain-actions/v1/earn/opportunity/${keyCategory}/${keyOpportunityId}/historical-data${queryString ? `?${queryString}` : ''}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch historical data: ${response.statusText}`);
      }

      return (await response.json()) as HistoricalData;
    },
    {
      refreshInterval: HISTORICAL_REVALIDATE_INTERVAL_MS,
      errorRetryCount: 2,
    },
  );

  return {
    data,
    isLoading,
    error,
    refetch: () => mutate(),
  };
}
