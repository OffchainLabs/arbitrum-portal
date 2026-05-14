'use client';

import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { SparklesIcon as SparklesIconSolid } from '@heroicons/react/24/solid';
import Link from 'next/link';

import { Tooltip } from '@/app-components/Tooltip';
import {
  type OpportunitySelectHandler,
  OpportunityTableRow,
  getCategoryDisplayName,
} from '@/app-types/earn/vaults';
import { SafeImage } from '@/bridge/components/common/SafeImage';

interface BestOpportunityCardProps {
  opportunity: OpportunityTableRow;
  onOpportunitySelect?: OpportunitySelectHandler;
}

export function BestOpportunityCard({
  opportunity,
  onOpportunitySelect,
}: BestOpportunityCardProps) {
  const categoryDisplayName = getCategoryDisplayName(opportunity.category);

  return (
    <Link
      href={`/earn/opportunity/${opportunity.category}/${opportunity.id}`}
      onClick={() => onOpportunitySelect?.(opportunity, 'featured-card')}
      className="group flex flex-col justify-between gap-4 rounded-[15px] border-[0.5px] border-bright-blue bg-earn-featured-card p-4 no-underline transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/5">
            <SafeImage
              src={opportunity.tokenIcon}
              alt={opportunity.token}
              width={34}
              height={34}
              className="shrink-0 rounded object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold leading-tight text-white">
              {opportunity.name}
            </p>
            <p className="mt-1 truncate text-xs leading-tight text-white/50">
              {categoryDisplayName}
            </p>
          </div>
        </div>
        <Tooltip
          content={
            <p className="text-xs leading-relaxed text-white">
              This opportunity has the highest total value locked (TVL) in its category, making it
              one of the most popular choices.
            </p>
          }
        >
          <div className="flex shrink-0 cursor-help items-center gap-1 rounded-md bg-earn-featured-badge px-2 py-1">
            <SparklesIconSolid className="h-3 w-3 text-white" />
            <span className="text-xs text-white">Featured</span>
          </div>
        </Tooltip>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <p className="text-sm leading-none text-white/50">APY</p>
          <p className="text-xl font-medium leading-tight text-white">{opportunity.apy}</p>
        </div>
        <div className="bg-white/10 rounded p-2 flex items-center justify-center group-hover:bg-white/20 shrink-0">
          <ChevronRightIcon className="h-4 w-4 text-white" />
        </div>
      </div>
    </Link>
  );
}
