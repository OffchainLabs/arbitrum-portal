'use client';

import dynamic from 'next/dynamic';

import { toTableRow } from '@/app-hooks/earn/useAllOpportunities';
import { useOpportunityDetails } from '@/app-hooks/earn/useOpportunityDetails';
import { OpportunityCategory } from '@/app-types/earn/vaults';
import { type EarnChainId } from '@/earn-api/types';

import { OpportunityDetailPageSkeleton } from './OpportunityDetailPageSkeleton';

const LendOpportunityDetailsPage = dynamic(
  () => import('./LendOpportunityDetailsPage').then((mod) => mod.LendOpportunityDetailsPage),
  { loading: () => <OpportunityDetailPageSkeleton /> },
);

const PendleDetailPage = dynamic(
  () => import('./PendleDetailPage').then((mod) => mod.PendleDetailPage),
  { loading: () => <OpportunityDetailPageSkeleton /> },
);

const LiquidStakingDetailPage = dynamic(
  () => import('./LiquidStakingDetailPage').then((mod) => mod.LiquidStakingDetailPage),
  { loading: () => <OpportunityDetailPageSkeleton /> },
);

interface OpportunityDetailPageProps {
  opportunityId: string;
  category: OpportunityCategory;
  chainId: EarnChainId;
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

  switch (data.category) {
    case OpportunityCategory.Lend:
      return <LendOpportunityDetailsPage opportunity={data} />;
    case OpportunityCategory.FixedYield:
      return <PendleDetailPage opportunity={data} />;
    case OpportunityCategory.LiquidStaking:
      return <LiquidStakingDetailPage opportunity={toTableRow(data)} />;
    default:
      return (
        <div className="rounded border-error bg-error/20 p-8 text-center">
          <p className="text-error">Unsupported category: {category}</p>
        </div>
      );
  }
}
