import useSWRImmutable from 'swr/immutable';

import { type VaultHolderEventsResponse, getVaultHolderEvents } from '../../services/vaultsSdk';

type UseVaultHolderEventsResult = {
  events: VaultHolderEventsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

/**
 * Fetches user transactions (holder events) for a vault
 */
export function useVaultHolderEvents(
  userAddress: string | null,
  network: string,
  vaultAddress: string,
): UseVaultHolderEventsResult {
  const { data, error, isLoading, mutate } = useSWRImmutable(
    userAddress && vaultAddress ? ['vaultHolderEvents', userAddress, network, vaultAddress] : null,
    async () => {
      if (!userAddress || !vaultAddress) return null;
      return await getVaultHolderEvents({ userAddress, network, vaultAddress });
    },
  );

  return {
    events: data ?? null,
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
  };
}
