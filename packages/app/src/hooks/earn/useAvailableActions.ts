'use client';

import type { SWRResponse } from 'swr';
import useSWRImmutable from 'swr/immutable';

import type { OpportunityCategory } from '@/app-types/earn/vaults';
import { ChainId } from '@/bridge/types/ChainId';
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
  chainId?: EarnChainId;
}

export type UseAvailableActionsResult<C extends OpportunityCategory> = Omit<
  SWRResponse<AvailableActionsByCategory[C], Error>,
  'data' | 'error'
> & {
  data: AvailableActionsByCategory[C] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

type AvailableActionsKey<C extends OpportunityCategory> = readonly [
  'available-actions',
  C,
  string,
  string,
  EarnChainId,
];

function buildAvailableActionsKey<C extends OpportunityCategory>(
  category: C,
  opportunityId: string,
  userAddress: string,
  chainId: EarnChainId,
): AvailableActionsKey<C> {
  return ['available-actions', category, opportunityId, userAddress, chainId] as const;
}

export function useAvailableActions<C extends OpportunityCategory>(
  params: UseAvailableActionsParams<C>,
): UseAvailableActionsResult<C> {
  const { opportunityId, category, userAddress, chainId = ChainId.ArbitrumOne } = params;
  const swrKey =
    opportunityId && category && userAddress
      ? buildAvailableActionsKey(category, opportunityId, userAddress, chainId)
      : null;

  const REFRESH_INTERVAL = 5 * 60 * 1000;

  const swrResponse = useSWRImmutable<AvailableActionsByCategory[C]>(
    swrKey,
    async ([
      ,
      keyCategory,
      keyOpportunityId,
      keyUserAddress,
      keyChainId,
    ]: AvailableActionsKey<C>) => {
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
      refreshInterval: REFRESH_INTERVAL,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 2,
    },
  );

  const { data, error, isLoading, mutate, ...restSWR } = swrResponse;

  return {
    ...restSWR,
    mutate,
    data: data ?? null,
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(undefined, { revalidate: true }),
  };
}
