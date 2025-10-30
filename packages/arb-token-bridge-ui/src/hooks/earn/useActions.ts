import useSWR from 'swr';

import { getActions } from '../../services/vaultsSdk';
import { DetailedVault } from '../../types/vaults';

interface UseActionsResult {
  actions: any[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useActions({
  action,
  userAddress,
  vault,
  amount,
  assetAddress,
  simulate = false,
  all = false,
}: {
  action: 'deposit' | 'redeem';
  userAddress: string | null;
  vault: DetailedVault;
  amount: string;
  assetAddress: string;
  simulate?: boolean;
  all?: boolean;
}): UseActionsResult {
  const { data, error, isLoading, mutate } = useSWR(
    userAddress && amount && parseFloat(amount) > 0
      ? [
          'actions',
          action,
          userAddress,
          vault.address,
          vault.network?.name,
          amount,
          assetAddress,
          simulate,
          all,
        ]
      : null,
    async () => {
      if (!userAddress || !amount || parseFloat(amount) <= 0) return null;

      return await getActions({
        action,
        userAddress,
        network: vault.network?.name || 'arbitrum',
        vaultAddress: vault.address,
        amount,
        assetAddress,
        simulate,
        all,
      });
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
    },
  );

  return {
    actions: data?.actions || null,
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
  };
}
