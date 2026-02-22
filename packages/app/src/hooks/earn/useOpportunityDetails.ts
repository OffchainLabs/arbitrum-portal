import useSWRImmutable from 'swr/immutable';
import { isAddress } from 'viem';

import { OPPORTUNITY_CATEGORIES, type OpportunityCategory } from '@/app-types/earn/vaults';
import { formatPercentage, formatTVL } from '@/bridge/util/NumberUtils';
import { type EarnNetwork, type StandardOpportunity, type Vendor } from '@/earn-api/types';

export interface StandardOpportunityDetail {
  id: string;
  category: OpportunityCategory;
  vendor: Vendor;
  network: string;
  name: string;
  token: string;
  tokenIcon: string;
  tokenNetwork: string;
  apy: string;
  tvl: string;
  rawApy: number;
  rawTvl: number;
  protocol: string;
  protocolIcon: string;
  vaultAddress: string;
  deposited: string | null;
  depositedUsd: string | null;
  earnings: string | null;
  earningsUsd: string | null;
  maturityDate?: string;
  apyBreakdown?: { base: number; reward: number; total: number };
  lend?: {
    protocolName: string;
    networkName: string;
    tvlUsd: number;
    assetSymbol?: string;
    assetLogo?: string;
    assetAddress?: string;
    protocolLogo?: string;
    description?: string;
    stakersCount?: number;
    apy30day?: number;
    apy7day?: number;
  };
}

type ApiOpportunityResponse = StandardOpportunity;

function flattenOpportunity(api: ApiOpportunityResponse): StandardOpportunityDetail {
  const m = api.metrics;
  return {
    id: api.id,
    category: api.category,
    vendor: api.vendor,
    network: api.network,
    name: api.name ?? api.id,
    token: api.token,
    tokenIcon: api.tokenIcon ?? '',
    tokenNetwork: api.tokenNetwork ?? api.network,
    protocol: api.protocol,
    protocolIcon: api.protocolIcon ?? '',
    vaultAddress: api.vaultAddress,
    // Keep formatting in UI hooks to avoid API opinionated display strings.
    apy: formatPercentage(m.rawApy ?? 0),
    tvl: formatTVL(m.rawTvl ?? 0),
    rawApy: m.rawApy,
    rawTvl: m.rawTvl,
    deposited: m.deposited,
    depositedUsd: m.depositedUsd,
    earnings: m.earnings,
    earningsUsd: m.earningsUsd,
    maturityDate: m.maturityDate,
    apyBreakdown: m.apyBreakdown,
    lend: api.lend,
  };
}

interface UseOpportunityDetailsResult {
  data: StandardOpportunityDetail | null;
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

  const { data, error, isLoading, mutate, ...rest } = useSWRImmutable<StandardOpportunityDetail>(
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
      const api = (await response.json()) as ApiOpportunityResponse;
      return flattenOpportunity(api);
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
