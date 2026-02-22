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
  const REVALIDATE_INTERVAL = 12 * 60 * 60 * 1000;

  const { data, error, isLoading, mutate, ...rest } = useSWRImmutable<OpportunitiesResponse>(
    [
      'earn-opportunities',
      filters?.network ?? null,
      filters?.minTvl ?? null,
      filters?.minApy ?? null,
    ] as const,
    async ([, network, minTvl, minApy]: readonly [
      string,
      EarnNetwork | null,
      number | null,
      number | null,
    ]) => {
      const params = new URLSearchParams();
      if (network) params.set('network', network);
      if (minTvl != null) params.set('minTvl', String(minTvl));
      if (minApy != null) params.set('minApy', String(minApy));

      const queryString = params.toString();
      const url = `/api/onchain-actions/v1/earn/opportunities${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch opportunities: ${response.statusText}`);
      }
      return (await response.json()) as OpportunitiesResponse;
    },
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
