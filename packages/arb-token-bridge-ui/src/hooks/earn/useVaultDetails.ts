import useSWRImmutable from 'swr/immutable';

import { getVault } from '../../services/vaultsSdk';

/**
 * Hook to fetch a single vault by ID using SWR
 */
export function useVaultDetails(vaultAddress: string, network: string = 'arbitrum') {
  const { data, error, isLoading, mutate } = useSWRImmutable(
    vaultAddress ? ['vault', vaultAddress, network] : null,
    async () => {
      if (!vaultAddress) return null;
      return await getVault(vaultAddress, network);
    },
  );

  return {
    vault: data,
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
  };
}
