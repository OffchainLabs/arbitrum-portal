import useSWR from 'swr';

import { getAllVaults, transformVaultToOpportunity } from '../../services/vaultsSdk';
import { OpportunityTableRow } from '../../types/vaults';

interface UseAllOpportunitiesResult {
  opportunities: OpportunityTableRow[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch all available opportunities using SWR
 */
export function useAllOpportunities(): UseAllOpportunitiesResult {
  const { data, error, isLoading, mutate } = useSWR(
    ['opportunities'],
    async () => {
      const vaults = await getAllVaults({ perPage: 50 });
      return vaults.map((vault) => transformVaultToOpportunity(vault));
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  return {
    opportunities: data || [],
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
  };
}
