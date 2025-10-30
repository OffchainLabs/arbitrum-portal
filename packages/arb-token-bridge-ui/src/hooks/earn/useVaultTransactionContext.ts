import useSWRImmutable from 'swr/immutable';

import { getTransactionsContext } from '../../services/vaultsSdk';

/**
 * Hook to fetch transaction context for a vault using SWR
 */
export function useVaultTransactionContext(
  userAddress: string | null,
  network: string,
  vaultAddress: string,
) {
  const { data, error, isLoading, mutate } = useSWRImmutable(
    userAddress && vaultAddress ? ['transactionContext', userAddress, network, vaultAddress] : null,
    async () => {
      if (!userAddress || !vaultAddress) return null;
      return await getTransactionsContext({
        userAddress,
        network,
        vaultAddress,
      });
    },
    {
      errorRetryCount: 2,
    },
  );

  return {
    transactionContext: data,
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
  };
}
