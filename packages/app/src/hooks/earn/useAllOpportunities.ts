import useSWRImmutable from 'swr/immutable';

import { OpportunityTableRow } from '@/app-types/earn/vaults';
import { formatPercentage, formatTVL } from '@/bridge/util/NumberUtils';
import { type EarnChainId, type StandardOpportunity } from '@/earn-api/types';

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

function parseMetricNumber(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

function toTableRow(opp: StandardOpportunity): OpportunityTableRow {
  const m = opp.metrics;
  const rawApy = parseMetricNumber(m?.rawApy);
  const rawTvl = parseMetricNumber(m?.rawTvl);

  return {
    id: opp.id,
    name: opp.name ?? opp.id,
    category: opp.category,
    token: opp.token,
    tokenIcon: opp.tokenIcon ?? '',
    tokenNetwork: opp.tokenNetwork ?? opp.network,
    apy: rawApy !== null ? formatPercentage(rawApy) : '—',
    apyBreakdown: m?.apyBreakdown,
    deposited: m?.deposited ?? null,
    depositedUsd: parseUsdMetric(m?.depositedUsd),
    projectedEarnings: m?.projectedEarnings ?? null,
    projectedEarningsUsd: parseUsdMetric(m?.projectedEarningsUsd),
    tvl: rawTvl !== null ? formatTVL(rawTvl) : '—',
    protocol: opp.protocol,
    protocolIcon: opp.protocolIcon ?? '',
    vaultAddress: opp.vaultAddress,
    rawApy,
    rawTvl,
    maturityDate: m?.maturityDate,
  };
}

export function useAllOpportunities(filters?: {
  chainId?: EarnChainId;
  minTvl?: number;
  minApy?: number;
}): UseAllOpportunitiesResult {
  const { data, error, isLoading, mutate, ...rest } = useSWRImmutable<OpportunitiesResponse>(
    [
      filters?.chainId ?? null,
      filters?.minTvl ?? null,
      filters?.minApy ?? null,
      'earn-opportunities',
    ] as const,
    async ([chainId, minTvl, minApy]: readonly [
      EarnChainId | null,
      number | null,
      number | null,
      string,
    ]) => {
      const params = new URLSearchParams();
      if (chainId) params.set('chainId', String(chainId));
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
    { errorRetryCount: 2 },
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
