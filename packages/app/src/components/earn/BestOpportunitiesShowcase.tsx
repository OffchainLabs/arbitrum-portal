import { useMemo } from 'react';

import { type OpportunitySelectHandler, OpportunityTableRow } from '@/app-types/earn/vaults';

import { BestOpportunityCard } from './BestOpportunityCard';
import { CATEGORY_ORDER } from './OpportunitiesTable';

interface BestOpportunitiesShowcaseProps {
  opportunities: OpportunityTableRow[];
  onOpportunitySelect?: OpportunitySelectHandler;
}

export function BestOpportunitiesShowcase({
  opportunities,
  onOpportunitySelect,
}: BestOpportunitiesShowcaseProps) {
  const bestOpportunities = useMemo(
    () =>
      CATEGORY_ORDER.map((category) =>
        opportunities
          .filter((opp) => opp.category === category && (opp.rawTvl ?? 0) > 0)
          .reduce<OpportunityTableRow | null>(
            (bestOpportunity, currentOpportunity) =>
              !bestOpportunity || (currentOpportunity.rawTvl ?? 0) > (bestOpportunity.rawTvl ?? 0)
                ? currentOpportunity
                : bestOpportunity,
            null,
          ),
      ).filter((opportunity): opportunity is OpportunityTableRow => opportunity !== null),
    [opportunities],
  );

  if (bestOpportunities.length === 0) {
    return null;
  }

  return (
    <div className="hidden lg:grid lg:grid-cols-3 gap-4">
      {bestOpportunities.map((opportunity) => (
        <BestOpportunityCard
          key={opportunity.id}
          opportunity={opportunity}
          onOpportunitySelect={onOpportunitySelect}
        />
      ))}
    </div>
  );
}
