import useSWRImmutable from 'swr/immutable';

import { OpportunityCategory, OpportunityTableRow } from '@/app-types/earn/vaults';
import { formatPercentage, formatTVL } from '@/bridge/util/NumberUtils';
import { type EarnNetwork, type StandardOpportunity } from '@/earn-api/types';

interface UseAllOpportunitiesResult {
  opportunities: OpportunityTableRow[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

interface OpportunitiesResponse {
  opportunities: StandardOpportunity[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
  };
  vendors: string[];
  categories: string[];
}

const fetcher = async (key: string | readonly unknown[]): Promise<OpportunitiesResponse> => {
  const url = typeof key === 'string' ? key : String(key[0] || '');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch opportunities');
  }
  return response.json();
};

function parseUsdMetric(s: string | null | undefined): number | null {
  if (s == null || s === '') return null;
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

function toTableRow(opp: StandardOpportunity): OpportunityTableRow {
  const m = opp.metrics;
  return {
    id: opp.id,
    name: opp.name ?? opp.id,
    category: opp.category as OpportunityCategory,
    token: opp.token,
    tokenIcon: opp.tokenIcon ?? '',
    tokenNetwork: opp.tokenNetwork ?? opp.network,
    apy: formatPercentage(m?.rawApy ?? 0),
    apyBreakdown: m?.apyBreakdown,
    deposited: m?.deposited ?? null,
    depositedUsd: parseUsdMetric(m?.depositedUsd),
    earnings: m?.earnings ?? null,
    earningsUsd: parseUsdMetric(m?.earningsUsd),
    tvl: formatTVL(m?.rawTvl ?? 0),
    protocol: opp.protocol,
    protocolIcon: opp.protocolIcon ?? '',
    vaultAddress: opp.vaultAddress,
    rawApy: m?.rawApy ?? 0,
    rawTvl: m?.rawTvl ?? 0,
    maturityDate: m?.maturityDate,
  };
}

export function useAllOpportunities(filters?: {
  network?: EarnNetwork;
  minTvl?: number;
  minApy?: number;
}): UseAllOpportunitiesResult {
  const params = new URLSearchParams();
  if (filters?.network) params.set('network', filters.network);
  if (filters?.minTvl) params.set('minTvl', filters.minTvl.toString());
  if (filters?.minApy) params.set('minApy', filters.minApy.toString());

  const url = `/api/onchain-actions/v1/earn/opportunities?${params.toString()}`;

  const REVALIDATE_INTERVAL = 12 * 60 * 60 * 1000;

  const { data, error, isLoading, mutate, ...rest } = useSWRImmutable<OpportunitiesResponse>(
    url,
    fetcher,
    { refreshInterval: REVALIDATE_INTERVAL, errorRetryCount: 2 },
  );

  const opportunities: OpportunityTableRow[] = data?.opportunities.map(toTableRow) ?? [];

  return {
    opportunities,
    isLoading,
    error: error?.message ?? null,
    refetch: () => mutate(),
    ...rest,
  };
}
