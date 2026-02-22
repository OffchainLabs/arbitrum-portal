import useSWRImmutable from 'swr/immutable';
import { isAddress } from 'viem';

import { OPPORTUNITY_CATEGORIES, type OpportunityCategory } from '@/app-types/earn/vaults';
import { formatPercentage, formatTVL } from '@/bridge/util/NumberUtils';

export interface StandardOpportunityDetail {
  id: string;
  category: OpportunityCategory;
  vendor: 'vaults' | 'lifi' | 'pendle';
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
  assetSymbol?: string;
  assetLogo?: string;
  assetAddress?: string;
  protocolName?: string;
  protocolLogo?: string;
  networkName?: string;
  description?: string;
  stakersCount?: number;
  apy30day?: number;
  apy7day?: number;
  tvlUsd?: number;
  expiry?: string;
  detailsTvlUsd?: number;
  detailsImpliedApy?: number;
  detailsUnderlyingApy?: number;
  detailsLiquidityUsd?: number;
  detailsTradingVolumeUsd?: number;
  ptTokenIcon?: string;
  pt?: string;
  underlyingAsset?: string;
  sySupplyCap?: number | null;
  syCurrentSupply?: number;
}

interface ApiOpportunityResponse {
  id: string;
  category: OpportunityCategory;
  vendor: string;
  network: string;
  protocol: string;
  token: string;
  vaultAddress: string;
  metrics: {
    rawApy: number;
    rawTvl: number;
    deposited: string | null;
    depositedUsd: string | null;
    earnings: string | null;
    earningsUsd: string | null;
    maturityDate?: string;
    apyBreakdown?: { base: number; reward: number; total: number };
  };
  name?: string;
  tokenIcon?: string;
  tokenNetwork?: string;
  protocolIcon?: string;
  apyFormatted?: string;
  tvlFormatted?: string;
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
  fixedYield?: {
    pt: string;
    detailsTvlUsd: number;
    detailsImpliedApy: number;
    expiry?: string;
    detailsUnderlyingApy?: number;
    detailsLiquidityUsd?: number;
    detailsTradingVolumeUsd?: number;
    ptTokenIcon?: string;
    underlyingAsset?: string;
    sySupplyCap?: number | null;
    syCurrentSupply?: number;
  };
}

function flattenOpportunity(api: ApiOpportunityResponse): StandardOpportunityDetail {
  const m = api.metrics;
  return {
    id: api.id,
    category: api.category,
    vendor: api.vendor as StandardOpportunityDetail['vendor'],
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
    ...api.lend,
    ...api.fixedYield,
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
  network: string = 'arbitrum',
): UseOpportunityDetailsResult {
  const REVALIDATE_INTERVAL = 24 * 60 * 60 * 1000;

  const isValid =
    opportunityId &&
    category &&
    isAddress(opportunityId) &&
    OPPORTUNITY_CATEGORIES.includes(category);

  const { data, error, isLoading, mutate, ...rest } = useSWRImmutable<StandardOpportunityDetail>(
    isValid ? ['opportunity-details', opportunityId, category, network] : null,
    async () => {
      const params = new URLSearchParams({ network });
      const response = await fetch(
        `/api/onchain-actions/v1/earn/opportunity/${category}/${opportunityId}?${params.toString()}`,
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
