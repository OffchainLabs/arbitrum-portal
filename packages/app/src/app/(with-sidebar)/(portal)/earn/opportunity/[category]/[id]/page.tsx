import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isAddress } from 'viem';

import { OpportunityDetailPage } from '@/app-components/earn/OpportunityDetailPage';
import { OPPORTUNITY_CATEGORIES, type OpportunityCategory } from '@/app-types/earn/vaults';
import { DEFAULT_EARN_CHAIN_ID } from '@/earn-api/types';

export async function generateMetadata({
  params,
}: {
  params: { category: string; id: string };
}): Promise<Metadata> {
  const category = params.category as OpportunityCategory;
  const categoryLabel =
    category === 'lend'
      ? 'Lending Opportunity'
      : category === 'liquid-staking'
        ? 'Liquid Staking Opportunity'
        : category === 'fixed-yield'
          ? 'Fixed Yield Opportunity'
          : 'Opportunity details';

  const fallbackMetadata: Metadata = {
    title: `Earn on Arbitrum | ${categoryLabel}`,
    description:
      'View APY, TVL, and your holdings for this Arbitrum earn opportunity across lending, liquid staking, and fixed yield.',
    openGraph: {
      title: `Earn on Arbitrum | ${categoryLabel}`,
      description:
        'View APY, TVL, and your holdings for this Arbitrum earn opportunity across lending, liquid staking, and fixed yield.',
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Earn on Arbitrum | ${categoryLabel}`,
      description:
        'View APY, TVL, and your holdings for this Arbitrum earn opportunity across lending, liquid staking, and fixed yield.',
    },
  };

  if (!isAddress(params.id) || !OPPORTUNITY_CATEGORIES.includes(category)) {
    return fallbackMetadata;
  }

  return fallbackMetadata;
}

export default function OpportunityDetailPageRoute({
  params,
}: {
  params: { category: string; id: string };
}) {
  if (!isAddress(params.id)) {
    return notFound();
  }

  const category = params.category as OpportunityCategory;
  if (!OPPORTUNITY_CATEGORIES.includes(category)) {
    return notFound();
  }

  return (
    <OpportunityDetailPage
      opportunityId={params.id}
      category={category}
      chainId={DEFAULT_EARN_CHAIN_ID}
    />
  );
}
