'use client';

import { OpportunityCategory, OpportunityTableRow } from '@/app-types/earn/vaults';

import { BestOpportunityCard } from './BestOpportunityCard';

interface BestOpportunitiesShowcaseProps {
  opportunities: OpportunityTableRow[];
}

export function BestOpportunitiesShowcase({ opportunities }: BestOpportunitiesShowcaseProps) {
  const best = opportunities
    .filter((opp) => opp.category === OpportunityCategory.Lend)
    .reduce<OpportunityTableRow | null>(
      (bestOpportunity, currentOpportunity) =>
        !bestOpportunity || currentOpportunity.rawTvl > bestOpportunity.rawTvl
          ? currentOpportunity
          : bestOpportunity,
      null,
    );

  if (!best) {
    return null;
  }

  return (
    <div className="hidden lg:grid lg:grid-cols-3 gap-4">
      <BestOpportunityCard opportunity={best} />
    </div>
  );
}
