'use client';

import useSWRImmutable from 'swr/immutable';

import type { OpportunityCategory } from '@/app-types/earn/vaults';
import {
  type AvailableActions,
  type EarnNetwork,
  type FixedYieldAvailableActions,
  type LendAvailableActions,
  type LiquidStakingAvailableActions,
} from '@/earn-api/types';

export type { FixedYieldAvailableActions, LendAvailableActions, LiquidStakingAvailableActions };

export interface UseAvailableActionsParams {
  opportunityId: string | null;
  category: OpportunityCategory;
  userAddress: string | null;
  network?: EarnNetwork;
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
 */
export function useAvailableActions(params: UseAvailableActionsParams): UseAvailableActionsResult {
  const { opportunityId, category, userAddress, network = 'arbitrum' } = params;

  // 5 minutes refresh interval
  const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  const { data, error, isLoading, mutate } = useSWRImmutable<AvailableActions>(
    opportunityId && category && userAddress
      ? ([opportunityId, category, userAddress, network, 'available-actions'] as const)
      : null,
    async ([keyOpportunityId, keyCategory, keyUserAddress, keyNetwork]: readonly [
      string,
      OpportunityCategory,
      string,
      EarnNetwork,
      string,
    ]) => {
      if (!keyUserAddress) {
        throw new Error('userAddress is required');
      }

      const queryParams = new URLSearchParams({
        userAddress: keyUserAddress,
        network: keyNetwork,
      });

      const response = await fetch(
        `/api/onchain-actions/v1/earn/opportunity/${keyCategory}/${keyOpportunityId}/available-actions?${queryParams.toString()}`,
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
