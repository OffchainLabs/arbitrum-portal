'use client';

import { useCallback } from 'react';
import useSWRImmutable from 'swr/immutable';

import type { OpportunityCategory } from '@/app-types/earn/vaults';
import {
  type EarnChainId,
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
  chainId: EarnChainId;
}

export function useAvailableActions<C extends OpportunityCategory>(
  params: UseAvailableActionsParams<C>,
) {
  const { opportunityId, category, userAddress, chainId } = params;
  const swrKey =
    opportunityId && category && userAddress
      ? (['available-actions', category, opportunityId, userAddress, chainId] as const)
      : null;

  const { data, error, isLoading, mutate, ...restSWR } = useSWRImmutable(
    swrKey,
    async ([, keyCategory, keyOpportunityId, keyUserAddress, keyChainId]) => {
      const queryParams = new URLSearchParams({
        userAddress: keyUserAddress,
        chainId: String(keyChainId),
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
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 2,
    },
  );

  const refetch = useCallback(() => {
    void mutate(undefined, { revalidate: true });
  }, [mutate]);

  return {
    ...restSWR,
    mutate,
    data: data ?? null,
    isLoading,
    error: error?.message || null,
    refetch,
  };
}
