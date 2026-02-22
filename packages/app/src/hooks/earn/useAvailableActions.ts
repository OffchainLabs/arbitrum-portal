'use client';

import useSWRImmutable from 'swr/immutable';

import type { OpportunityCategory } from '@/app-types/earn/vaults';
import {
  type EarnNetwork,
  type FixedYieldAvailableActions,
  type LendAvailableActions,
  type LiquidStakingAvailableActions,
} from '@/earn-api/types';

export type { FixedYieldAvailableActions, LendAvailableActions, LiquidStakingAvailableActions };

type AvailableActionsByCategory = {
  [OpportunityCategory.Lend]: LendAvailableActions;
  [OpportunityCategory.FixedYield]: FixedYieldAvailableActions;
  [OpportunityCategory.LiquidStaking]: LiquidStakingAvailableActions;
};

export interface UseAvailableActionsParams<C extends OpportunityCategory> {
  opportunityId: string | null;
  category: C;
  userAddress: string | null;
  network?: EarnNetwork;
}

export interface UseAvailableActionsResult<C extends OpportunityCategory> {
  data: AvailableActionsByCategory[C] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

type AvailableActionsKey<C extends OpportunityCategory> = readonly [
  'available-actions',
  C,
  string,
  string,
  EarnNetwork,
];

function buildAvailableActionsKey<C extends OpportunityCategory>(
  category: C,
  opportunityId: string,
  userAddress: string,
  network: EarnNetwork,
): AvailableActionsKey<C> {
  return ['available-actions', category, opportunityId, userAddress, network] as const;
}

/**
 * Unified hook to fetch available actions by opportunity ID and category
 * Returns category-specific action contracts with typed transaction context.
 *
 * Returns available actions and vendor-specific context:
 * - For Vaults (lend): Full transaction context including deposit/redeem steps, claimable rewards
 * - For other categories: Minimal context (just available actions)
 */
export function useAvailableActions<C extends OpportunityCategory>(
  params: UseAvailableActionsParams<C>,
): UseAvailableActionsResult<C> {
  const { opportunityId, category, userAddress, network = 'arbitrum' } = params;
  const swrKey =
    opportunityId && category && userAddress
      ? buildAvailableActionsKey(category, opportunityId, userAddress, network)
      : null;

  // 5 minutes refresh interval
  const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  const { data, error, isLoading, mutate } = useSWRImmutable<AvailableActionsByCategory[C]>(
    swrKey,
    async ([
      ,
      keyCategory,
      keyOpportunityId,
      keyUserAddress,
      keyNetwork,
    ]: AvailableActionsKey<C>) => {
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

      return (await response.json()) as AvailableActionsByCategory[C];
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
