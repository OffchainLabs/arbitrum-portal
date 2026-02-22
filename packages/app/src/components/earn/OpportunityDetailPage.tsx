'use client';

import { useOpportunityDetails } from '@/app-hooks/earn/useOpportunityDetails';
import { OpportunityCategory } from '@/app-types/earn/vaults';

import { LendOpportunityDetailsPage } from './LendOpportunityDetailsPage';
import { OpportunityDetailPageSkeleton } from './OpportunityDetailPageSkeleton';

interface OpportunityDetailPageProps {
  opportunityId: string;
  category: OpportunityCategory;
}

export function OpportunityDetailPage({ opportunityId, category }: OpportunityDetailPageProps) {
  const { data, isLoading, error } = useOpportunityDetails(opportunityId, category, 'arbitrum');

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

  if (category !== OpportunityCategory.Lend) {
    return (
      <div className="rounded border-error bg-error/20 p-8 text-center">
        <p className="text-error">Unknown category: {category}</p>
      </div>
    );
  }

  return <LendOpportunityDetailsPage opportunity={data} />;
}
