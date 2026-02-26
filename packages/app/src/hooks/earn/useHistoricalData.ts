'use client';

import useSWR from 'swr';

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
  data: HistoricalData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const HISTORICAL_REVALIDATE_INTERVAL_MS = HISTORICAL_VENDOR_TTL_SECONDS * 1000;

export function useHistoricalData(params: UseHistoricalDataParams): UseHistoricalDataResult {
  const { opportunityId, category, chainId = ChainId.ArbitrumOne, range, assetSymbol } = params;
  const normalizedAssetSymbol = assetSymbol?.toLowerCase();

  const { data, error, isLoading, mutate } = useSWR<HistoricalData>(
    opportunityId && category
      ? ['historical-data', opportunityId, category, chainId, range, normalizedAssetSymbol]
      : null,
    async ([, keyOpportunityId, keyCategory, keyChainId, keyRange, keyAssetSymbol]: readonly [
      string,
      string,
      OpportunityCategory,
      EarnChainId,
      HistoricalTimeRange,
      string | undefined,
    ]) => {
      const queryParams = new URLSearchParams();
      queryParams.set('chainId', String(keyChainId));
      queryParams.set('range', keyRange);
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
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      errorRetryCount: 2,
    },
  );

  return {
    data: data ?? null,
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
  };
}
