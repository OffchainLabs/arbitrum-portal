'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { OpportunityTableRow } from '@/app-types/earn/vaults';
import { Button } from '@/bridge/components/common/Button';

import { BestOpportunitiesShowcase } from './BestOpportunitiesShowcase';

interface YourHoldingsEmptyStateProps {
  opportunities: OpportunityTableRow[];
}

export function YourHoldingsEmptyState({ opportunities }: YourHoldingsEmptyStateProps) {
  const router = useRouter();

  const handleExploreClick = () => {
    router.push('/earn/market');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Table Headers */}
      {/* <div className="flex gap-4 items-center pt-4 px-4 pb-0 opacity-50">
        <div className="w-[120px] shrink-0">
          <p className="text-sm text-white/50 leading-[1.15] tracking-[-0.28px]">Type</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/50 leading-[1.15] tracking-[-0.28px]">Vault</p>
        </div>
        <div className="flex-1 flex gap-2 items-center min-w-0">
          <p className="text-sm text-white/50 leading-[1.15] tracking-[-0.28px]">APY</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/50 leading-[1.15] tracking-[-0.28px]">Deposited</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/50 leading-[1.15] tracking-[-0.28px]">Earnings</p>
        </div>
        <div className="w-[122px] shrink-0">
          <p className="text-sm text-white/50 leading-[1.15] tracking-[-0.28px]">Network</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/50 leading-[1.15] tracking-[-0.28px]">Protocol</p>
        </div>
        <div className="w-[42px] shrink-0"></div>
      </div> */}

      <div className="bg-neutral-50 rounded flex flex-col items-center justify-center px-8 gap-8 py-12">
        <div className="flex flex-col items-center gap-4">
          {/* Diamond Image */}
          <div className="w-24 h-24 shrink-0">
            <Image
              src="/images/diamond-empty-state.svg"
              alt=""
              width={96}
              height={96}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Heading */}
          <h2 className="text-[32px] font-medium text-white text-center leading-normal">
            No active positions yet
          </h2>

          {/* Description */}
          <p className="text-base text-white/50 text-center leading-[101.325%] max-w-[330px]">
            Explore earn opportunities with liquid staking, lending, and fixed yield products
          </p>
        </div>

        {/* CTA Button */}
        <Button
          variant="primary"
          onClick={handleExploreClick}
          className="bg-primary-cta hover:bg-primary-cta/90 px-4 flex items-center justify-center transition-colors cursor-pointer rounded"
        >
          Explore Opportunities
        </Button>
      </div>

      {/* Opportunity Showcase */}
      <BestOpportunitiesShowcase opportunities={opportunities} />
    </div>
  );
}
