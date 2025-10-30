import useSWRImmutable from 'swr/immutable';

import { type VaultHistoricalDataResponse, getVaultHistoricalData } from '../../services/vaultsSdk';

export type HistoricalInterval = '1day' | '7day' | '30day' | string;

type UseVaultHistoricalDataArgs = {
  network: string;
  vaultAddress: string;
  apyInterval?: HistoricalInterval;
  fromTimestamp?: number; // seconds since epoch
  toTimestamp?: number; // seconds since epoch
  page?: number;
  perPage?: number;
};

type UseVaultHistoricalDataResult = {
  data: VaultHistoricalDataResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

/**
 * Fetch historical APY/TVL/sharePrice for a vault. Immutable by default.
 * Intended for charting (7D/30D/90D etc.).
 */
export function useVaultHistoricalData({
  network,
  vaultAddress,
  apyInterval = '7day',
  fromTimestamp,
  toTimestamp,
  page = 0,
  perPage = 200,
}: UseVaultHistoricalDataArgs): UseVaultHistoricalDataResult {
  const { data, error, isLoading, mutate } = useSWRImmutable(
    vaultAddress && network
      ? [
          'vaultHistoricalData',
          network,
          vaultAddress,
          apyInterval,
          fromTimestamp ?? null,
          toTimestamp ?? null,
          page,
          perPage,
        ]
      : null,
    async () => {
      if (!vaultAddress || !network) return null;
      return await getVaultHistoricalData({
        network,
        vaultAddress,
        apyInterval,
        fromTimestamp,
        toTimestamp,
        page,
        perPage,
      });
    },
    {
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
