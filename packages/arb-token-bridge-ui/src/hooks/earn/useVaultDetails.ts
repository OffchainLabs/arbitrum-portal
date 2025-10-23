import useSWR from 'swr';

import { getVault } from '../../services/vaultsSdk';

/**
 * Hook to fetch a single vault by ID using SWR
 */
export function useVaultDetails(vaultAddress: string, network: string = 'mainnet') {
  const { data, error, isLoading, mutate } = useSWR(
    vaultAddress ? ['vault', vaultAddress, network] : null,
    async () => {
      if (!vaultAddress) return null;
      return await getVault(vaultAddress, network);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  return {
    vault: data,
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
  };
}
