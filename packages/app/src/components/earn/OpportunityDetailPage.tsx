'use client';

import { useOpportunityDetails } from '@/app-hooks/earn/useOpportunityDetails';
import { OpportunityCategory, type OpportunityTableRow } from '@/app-types/earn/vaults';
import { formatCompactUsd, formatPercentage } from '@/bridge/util/NumberUtils';
import { type EarnChainId, type StandardOpportunity } from '@/earn-api/types';

import { LendOpportunityDetailsPage } from './LendOpportunityDetailsPage';
import { LiquidStakingDetailPage } from './LiquidStakingDetailPage';
import { OpportunityDetailPageSkeleton } from './OpportunityDetailPageSkeleton';

interface OpportunityDetailPageProps {
  opportunityId: string;
  category: OpportunityCategory;
  chainId: EarnChainId;
}

function parseMetricNumber(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

function parseOptionalNumber(value: number | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  return Number.isFinite(value) ? value : null;
}

function toTableRow(opportunity: StandardOpportunity): OpportunityTableRow {
  const rawApy = parseMetricNumber(opportunity.metrics.rawApy);
  const rawTvl = parseMetricNumber(opportunity.metrics.rawTvl);

  return {
    id: opportunity.id,
    chainId: opportunity.chainId,
    name: opportunity.name ?? opportunity.id,
    category: opportunity.category,
    token: opportunity.token,
    tokenIcon: opportunity.tokenIcon ?? '',
    tokenNetwork: opportunity.tokenNetwork ?? opportunity.network,
    apy: rawApy !== null ? formatPercentage(rawApy) : '—',
    apyBreakdown: opportunity.metrics.apyBreakdown,
    deposited: opportunity.metrics.deposited,
    depositedUsd: parseOptionalNumber(opportunity.metrics.depositedUsd),
    projectedEarningsUsd: parseOptionalNumber(opportunity.metrics.projectedEarningsUsd),
    tvl: rawTvl !== null ? formatCompactUsd(rawTvl) : '—',
    protocol: opportunity.protocol,
    protocolIcon: opportunity.protocolIcon ?? '',
    vaultAddress: opportunity.vaultAddress,
    rawApy,
    rawTvl,
    maturityDate: opportunity.metrics.maturityDate,
  };
}

export function OpportunityDetailPage({
  opportunityId,
  category,
  chainId,
}: OpportunityDetailPageProps) {
  const { data, isLoading, error } = useOpportunityDetails(opportunityId, category, chainId);

  if (isLoading) {
    return <OpportunityDetailPageSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded border-error bg-error/20 p-8 text-center">
        <p className="text-error">Failed to load opportunity: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded border border-neutral-200 bg-neutral-50 p-8 text-center">
        <p className="text-gray-5">Opportunity not found.</p>
      </div>
    );
  }

  if (data.category !== category) {
    return (
      <div className="rounded border-error bg-error/20 p-8 text-center">
        <p className="text-error">
          Opportunity category mismatch: expected {category}, got {data.category}.
        </p>
      </div>
    );
  }

  switch (category) {
    case OpportunityCategory.Lend:
      if (data.category !== OpportunityCategory.Lend) {
        return (
          <div className="rounded border-error bg-error/20 p-8 text-center">
            <p className="text-error">Unsupported category: {data.category}</p>
          </div>
        );
      }
      return <LendOpportunityDetailsPage opportunity={data} />;
    case OpportunityCategory.LiquidStaking:
      if (data.category !== OpportunityCategory.LiquidStaking) {
        return (
          <div className="rounded border-error bg-error/20 p-8 text-center">
            <p className="text-error">Unsupported category: {data.category}</p>
          </div>
        );
      }
      return <LiquidStakingDetailPage opportunity={toTableRow(data)} />;
    default:
      return (
        <div className="rounded border-error bg-error/20 p-8 text-center">
          <p className="text-error">Unsupported category: {category}</p>
        </div>
      );
  }
}
