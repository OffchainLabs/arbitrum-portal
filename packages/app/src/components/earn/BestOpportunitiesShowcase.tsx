'use client';

import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { SparklesIcon as SparklesIconSolid } from '@heroicons/react/24/solid';
import Link from 'next/link';

import {
  OpportunityCategory,
  OpportunityTableRow,
  getCategoryDisplayName,
} from '@/app-types/earn/vaults';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { Tooltip } from '@/bridge/components/common/Tooltip';

interface BestOpportunitiesShowcaseProps {
  opportunities: OpportunityTableRow[];
}

export function BestOpportunitiesShowcase({ opportunities }: BestOpportunitiesShowcaseProps) {
  const categoryOpportunities = opportunities.filter(
    (opp) => opp.category === OpportunityCategory.Lend,
  );
  const best = categoryOpportunities.sort((a, b) => b.rawTvl - a.rawTvl)[0];
  const bestOpportunities = best ? [best] : [];

  if (bestOpportunities.length === 0) {
    return null;
  }

  return (
    <div className="hidden lg:grid lg:grid-cols-3 gap-4">
      {bestOpportunities.map((opportunity) => {
        const categoryDisplayName = getCategoryDisplayName(opportunity.category);

        return (
          <Link
            key={opportunity.id}
            href={`/earn/opportunity/${opportunity.category}/${opportunity.id}`}
            className="group bg-neutral-100 rounded p-4 flex flex-col gap-4 hover:bg-default-black-hover transition-colors relative justify-between no-underline"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="shrink-0 w-10 h-10">
                  <SafeImage
                    src={opportunity.tokenIcon}
                    alt={opportunity.token}
                    width={40}
                    height={40}
                    className="shrink-0 object-contain rounded w-10 h-10"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-white leading-tight truncate">
                    {opportunity.name}
                  </p>
                  <p className="text-xs text-white/50 leading-tight truncate mt-0.5">
                    {categoryDisplayName}
                  </p>
                </div>
              </div>
              <Tooltip
                content={
                  <div className="p-2 bg-neutral-100 rounded max-w-xs">
                    <p className="text-xs text-white leading-relaxed">
                      This opportunity has the highest total value locked (TVL) in its category,
                      making it one of the most popular choices.
                    </p>
                  </div>
                }
                tippyProps={{ placement: 'top' }}
              >
                <div className="shrink-0 flex items-center gap-1 bg-primary-cta rounded px-2 py-1 cursor-help">
                  <SparklesIconSolid className="h-3 w-3 text-white" />
                  <span className="text-xs font-medium text-white">Featured</span>
                </div>
              </Tooltip>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-xs text-white/50 leading-none">APY</p>
                <p className="text-2xl font-semibold text-white leading-tight">{opportunity.apy}</p>
              </div>
              <div className="shrink-0 bg-white/10 rounded p-2 flex items-center justify-center group-hover:bg-white/20">
                <ChevronRightIcon className="h-4 w-4 text-white" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
