import useSWR from 'swr';

import { getAllVaults, getUserPositions, transformVaultToOpportunity } from '../services/vaultsSdk';
import { OpportunityTableRow } from '../types/vaults';

// Re-export the interface from types
export type { OpportunityTableRow } from '../types/vaults';

interface UseOpportunitiesResult {
  opportunities: OpportunityTableRow[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch all available opportunities using SWR
 */
export function useOpportunities(): UseOpportunitiesResult {
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

/**
 * Hook to fetch user opportunities with position details using SWR
 */
export function useUserOpportunities(
  userAddress: string | null,
  allowedNetworks: string[],
): UseOpportunitiesResult {
  const { data, error, isLoading, mutate } = useSWR(
    userAddress ? ['userOpportunities', userAddress, allowedNetworks] : null,
    async () => {
      if (!userAddress) return [];

      // Fetch user positions and all vaults in parallel
      const [positions, vaults] = await Promise.all([
        getUserPositions({ userAddress }),
        getAllVaults({ perPage: 50 }),
      ]);

      // Create a map of vault address to vault data
      const vaultMap = new Map<string, (typeof vaults)[0]>();
      vaults.forEach((vault) => {
        vaultMap.set(vault.address.toLowerCase(), vault);
      });

      // Transform positions to opportunity rows
      return positions
        .map((position) => {
          const vault = vaultMap.get(position.address.toLowerCase());
          if (!vault) return null;
          return transformVaultToOpportunity(vault, position);
        })
        .filter((row): row is OpportunityTableRow => row !== null);
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
