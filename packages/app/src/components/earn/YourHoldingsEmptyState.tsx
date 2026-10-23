'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePostHog } from 'posthog-js/react';
import { useAccount } from 'wagmi';

import {
  type OpportunitySelectHandler,
  OpportunityTableRow,
  getCategoryDisplayName,
} from '@/app-types/earn/vaults';
import { useWalletModal } from '@/bridge/wallet/hooks/useWalletModal';

import { BestOpportunitiesShowcase } from './BestOpportunitiesShowcase';

interface YourHoldingsEmptyStateProps {
  opportunities?: OpportunityTableRow[];
}

export function YourHoldingsEmptyState({ opportunities }: YourHoldingsEmptyStateProps) {
  const { isConnected } = useAccount();
  const { openConnectModal } = useWalletModal();
  const posthog = usePostHog();

  const title = isConnected ? 'No active positions yet' : 'Connect your wallet to get started';
  const description = isConnected
    ? 'Explore earn opportunities with liquid staking, lending, and fixed yield products.'
    : 'Connect your wallet to see your holdings and explore earn opportunities.';

  const handleOpportunitySelect: OpportunitySelectHandler = (opportunity, surface) => {
    posthog?.capture('Earn Opportunity Selected', {
      page: 'Earn',
      surface,
      section: getCategoryDisplayName(opportunity.category),
      category: opportunity.category,
      asset: opportunity.token,
      protocol: opportunity.protocol,
      apy: opportunity.rawApy,
      tvl: opportunity.rawTvl,
      chainId: opportunity.chainId,
      walletConnected: isConnected,
      opportunityId: opportunity.id,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center justify-center gap-8 rounded bg-neutral-50 px-8 py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-24 w-24 shrink-0" aria-hidden="true">
            <Image
              src="/images/diamond-empty-state.svg"
              alt="Empty state diamond"
              width={96}
              height={96}
              className="h-full w-full object-contain"
            />
          </div>

          <h2 className="text-center text-[32px] leading-normal font-medium text-white">{title}</h2>

          <p className="max-w-[330px] text-center text-base leading-[101.325%] text-white/50">
            {description}
          </p>
        </div>

        {isConnected ? (
          <Link
            href="/earn/market"
            className="flex cursor-pointer items-center justify-center rounded border border-dark bg-primary-cta px-4 py-2 text-sm text-white no-underline transition-colors hover:bg-primary-cta/90"
          >
            Explore Opportunities
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              posthog?.capture('Earn Connect Wallet Clicked', {
                page: 'Earn',
                section: 'Your Holdings',
                walletConnected: false,
              });
              openConnectModal();
            }}
            className="flex cursor-pointer items-center justify-center rounded border border-dark bg-primary-cta px-4 py-2 text-sm text-white no-underline transition-colors hover:bg-primary-cta/90"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {opportunities && opportunities.length > 0 && (
        <BestOpportunitiesShowcase
          opportunities={opportunities}
          onOpportunitySelect={handleOpportunitySelect}
        />
      )}
    </div>
  );
}
