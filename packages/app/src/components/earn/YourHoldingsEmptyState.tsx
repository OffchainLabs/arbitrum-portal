'use client';

import Image from 'next/image';
import Link from 'next/link';

import { OpportunityTableRow } from '@/app-types/earn/vaults';

import { BestOpportunitiesShowcase } from './BestOpportunitiesShowcase';

interface YourHoldingsEmptyStateProps {
  opportunities: OpportunityTableRow[];
}

export function YourHoldingsEmptyState({ opportunities }: YourHoldingsEmptyStateProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-neutral-50 rounded flex flex-col items-center justify-center px-8 gap-8 py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 shrink-0" aria-hidden="true">
            <Image
              src="/images/diamond-empty-state.svg"
              alt=""
              width={96}
              height={96}
              className="w-full h-full object-contain"
            />
          </div>

          <h2 className="text-[32px] font-medium text-white text-center leading-normal">
            No active positions yet
          </h2>

          <p className="text-base text-white/50 text-center leading-[101.325%] max-w-[330px]">
            Explore earn opportunities with liquid staking, lending, and fixed yield products
          </p>
        </div>

        <Link
          href="/earn/market"
          className="bg-primary-cta hover:bg-primary-cta/90 px-4 flex items-center justify-center transition-colors cursor-pointer rounded border border-dark text-sm text-white py-2 no-underline"
        >
          Explore Opportunities
        </Link>
      </div>

      {/* Opportunity Showcase */}
      <BestOpportunitiesShowcase opportunities={opportunities} />
    </div>
  );
}
