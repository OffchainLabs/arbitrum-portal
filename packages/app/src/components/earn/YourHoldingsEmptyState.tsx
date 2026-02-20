'use client';

import { useConnectModal } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import Link from 'next/link';
import { useAccount } from 'wagmi';

import { OpportunityTableRow } from '@/app-types/earn/vaults';

import { BestOpportunitiesShowcase } from './BestOpportunitiesShowcase';

interface YourHoldingsEmptyStateProps {
  opportunities?: OpportunityTableRow[];
}

export function YourHoldingsEmptyState({ opportunities }: YourHoldingsEmptyStateProps) {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const title = isConnected ? 'No active positions yet' : 'Connect your wallet to get started';
  const description = isConnected
    ? 'Explore earn opportunities with liquid staking, lending, and fixed yield products.'
    : 'Connect your wallet to see your holdings and explore earn opportunities.';

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-neutral-50 rounded flex flex-col items-center justify-center px-8 gap-8 py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 shrink-0" aria-hidden="true">
            <Image
              src="/images/diamond-empty-state.svg"
              alt="Empty state diamond"
              width={96}
              height={96}
              className="w-full h-full object-contain"
            />
          </div>

          <h2 className="text-[32px] font-medium text-white text-center leading-normal">{title}</h2>

          <p className="text-base text-white/50 text-center leading-[101.325%] max-w-[330px]">
            {description}
          </p>
        </div>

        {isConnected ? (
          <Link
            href="/earn/market"
            className="bg-primary-cta hover:bg-primary-cta/90 px-4 flex items-center justify-center transition-colors cursor-pointer rounded border border-dark text-sm text-white py-2 no-underline"
          >
            Explore Opportunities
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => openConnectModal?.()}
            className="bg-primary-cta hover:bg-primary-cta/90 px-4 flex items-center justify-center transition-colors cursor-pointer rounded border border-dark text-sm text-white py-2 no-underline"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Opportunity Showcase */}
      {opportunities && <BestOpportunitiesShowcase opportunities={opportunities} />}
    </div>
  );
}
