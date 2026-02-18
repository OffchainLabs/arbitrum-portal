import {
  EARN_API_CACHE_SCHEMA_VERSION,
  useLocalStorageSWR,
} from '@/app-lib/swr/useLocalStorageSWR';
import { OpportunityCategory, OpportunityTableRow } from '@/app-types/earn/vaults';
import { formatPercentage, formatTVL } from '@/bridge/util/NumberUtils';

export interface StandardOpportunityApi {
  id: string;
  category: OpportunityCategory;
  vendor: 'vaults' | 'lifi' | 'pendle';
  network: string;
  protocol: string;
  token: string;
  vaultAddress: string;
  metrics: {
    rawApy: number;
    rawTvl: number;
    deposited: string;
    depositedUsd: string;
    earnings: string;
    earningsUsd: string;
    maturityDate?: string;
    apyBreakdown?: { base: number; reward: number; total: number };
  };
  name?: string;
  tokenIcon?: string;
  tokenNetwork?: string;
  protocolIcon?: string;
  apyFormatted?: string;
  tvlFormatted?: string;
}

interface UseAllOpportunitiesResult {
  opportunities: OpportunityTableRow[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

interface OpportunitiesResponse {
  opportunities: StandardOpportunityApi[];
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

function toTableRow(opp: StandardOpportunityApi): OpportunityTableRow {
  const m = opp.metrics;
  return {
    id: opp.id,
    name: opp.name ?? opp.id,
    category: opp.category as OpportunityCategory,
    token: opp.token,
    tokenIcon: opp.tokenIcon ?? '',
    tokenNetwork: opp.tokenNetwork ?? opp.network,
    apy: opp.apyFormatted ?? formatPercentage(m?.rawApy ?? 0),
    apyBreakdown: m?.apyBreakdown,
    deposited: m?.deposited ?? '-',
    depositedUsd: m?.depositedUsd ?? '-',
    earnings: m?.earnings ?? '-',
    earningsUsd: m?.earningsUsd ?? '-',
    tvl: opp.tvlFormatted ?? formatTVL(m?.rawTvl ?? 0),
    protocol: opp.protocol,
    protocolIcon: opp.protocolIcon ?? '',
    vaultAddress: opp.vaultAddress,
    rawApy: m?.rawApy ?? 0,
    rawTvl: m?.rawTvl ?? 0,
    maturityDate: m?.maturityDate,
  };
}

export function useAllOpportunities(filters?: {
  network?: string;
  minTvl?: number;
  minApy?: number;
}): UseAllOpportunitiesResult {
  const params = new URLSearchParams();
  if (filters?.network) params.set('network', filters.network);
  if (filters?.minTvl) params.set('minTvl', filters.minTvl.toString());
  if (filters?.minApy) params.set('minApy', filters.minApy.toString());

  const url = `/api/onchain-actions/v1/earn/opportunities?${params.toString()}`;

  const REVALIDATE_INTERVAL = 12 * 60 * 60 * 1000;

  const { data, error, isLoading, mutate } = useLocalStorageSWR<OpportunitiesResponse>(
    [url, EARN_API_CACHE_SCHEMA_VERSION],
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshInterval: REVALIDATE_INTERVAL,
      errorRetryCount: 2,
    },
  );

  const opportunities: OpportunityTableRow[] = data?.opportunities.map(toTableRow) ?? [];

  return {
    opportunities,
    isLoading,
    error: error?.message ?? null,
    refetch: () => mutate(),
  };
}
