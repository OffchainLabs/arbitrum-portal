import useSWR from 'swr';

import type { OpportunityCategory } from '@/earn-api/types';
import type { AvailableActions as ApiAvailableActions } from '@/earn-api/types';

export type AvailableActions = ApiAvailableActions;

export type LendAvailableActions = AvailableActions & {
  vendor: 'vaults';
  transactionContext: NonNullable<AvailableActions['transactionContext']>;
};

export type LiquidStakingAvailableActions = AvailableActions & {
  vendor: 'lifi';
  transactionContext: null;
};

export type FixedYieldAvailableActions = AvailableActions & {
  vendor: 'pendle';
  transactionContext: null;
};

export interface UseAvailableActionsParams {
  opportunityId: string | null;
  category: OpportunityCategory;
  userAddress: string | null;
  network?: string;
}

export interface UseAvailableActionsResult {
  data: AvailableActions | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Unified hook to fetch available actions by opportunity ID and category
 * Replaces useVaultTransactionContext
 *
 * Returns available actions and vendor-specific context:
 * - For Vaults (lend): Full transaction context including deposit/redeem steps, claimable rewards
 * - For other categories: Minimal context (just available actions)
 *
 * Note: Balances are fetched client-side via direct contract calls (useTokenBalance, useETHBalance)
 */
export function useAvailableActions(params: UseAvailableActionsParams): UseAvailableActionsResult {
  const { opportunityId, category, userAddress, network = 'arbitrum' } = params;

  // 5 minutes refresh interval
  const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  const { data, error, isLoading, mutate } = useSWR<AvailableActions>(
    opportunityId && category && userAddress
      ? ['available-actions', opportunityId, category, userAddress, network]
      : null,
    async () => {
      if (!userAddress) {
        throw new Error('userAddress is required');
      }

      const queryParams = new URLSearchParams({
        userAddress,
        network,
      });

      const response = await fetch(
        `/api/onchain-actions/v1/earn/opportunity/${category}/${opportunityId}/available-actions?${queryParams.toString()}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch available actions: ${response.statusText}`);
      }

      return (await response.json()) as AvailableActions;
    },
    {
      refreshInterval: REFRESH_INTERVAL, // Refetch every 5 minutes
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 2,
    },
  );

  return {
    data: data ?? null,
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(undefined, { revalidate: true }),
  };
}
