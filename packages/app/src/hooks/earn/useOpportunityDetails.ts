import useSWRImmutable from 'swr/immutable';
import { isAddress } from 'viem';

import { OPPORTUNITY_CATEGORIES, type OpportunityCategory } from '@/app-types/earn/vaults';
import { type EarnNetwork, type StandardOpportunity } from '@/earn-api/types';

interface UseOpportunityDetailsResult {
  data: StandardOpportunity | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useOpportunityDetails(
  opportunityId: string,
  category: OpportunityCategory,
  network: EarnNetwork = 'arbitrum',
): UseOpportunityDetailsResult {
  const REVALIDATE_INTERVAL = 24 * 60 * 60 * 1000;

  const isValid =
    opportunityId &&
    category &&
    isAddress(opportunityId) &&
    OPPORTUNITY_CATEGORIES.includes(category);

  const { data, error, isLoading, mutate, ...rest } = useSWRImmutable<StandardOpportunity>(
    isValid ? ([opportunityId, category, network, 'opportunity-details'] as const) : null,
    async ([keyOpportunityId, keyCategory, keyNetwork]: readonly [
      string,
      OpportunityCategory,
      EarnNetwork,
      string,
    ]) => {
      const params = new URLSearchParams({ network: keyNetwork });
      const response = await fetch(
        `/api/onchain-actions/v1/earn/opportunity/${keyCategory}/${keyOpportunityId}?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch opportunity details: ${response.statusText}`);
      }
      return (await response.json()) as StandardOpportunity;
    },
    { refreshInterval: REVALIDATE_INTERVAL, errorRetryCount: 2 },
  );

  return {
    data: data ?? null,
    isLoading,
    error: error?.message ?? null,
    refetch: () => mutate(),
    ...rest,
  };
}
