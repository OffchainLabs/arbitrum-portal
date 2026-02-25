import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isAddress } from 'viem';

import { OpportunityDetailPage } from '@/app-components/earn/OpportunityDetailPage';
import { OPPORTUNITY_CATEGORIES, type OpportunityCategory } from '@/app-types/earn/vaults';
import { ChainId } from '@/bridge/types/ChainId';
import { CategoryRouter } from '@/earn-api/CategoryRouter';
import { EARN_CHAIN_IDS, type EarnChainId } from '@/earn-api/types';

type SearchParams = Record<string, string | string[] | undefined>;

function getRequestedChainId(searchParams?: SearchParams): EarnChainId {
  const rawValue = searchParams?.chainId;
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  if (!value) {
    return ChainId.ArbitrumOne;
  }

  const parsed = Number(value);
  if (EARN_CHAIN_IDS.includes(parsed as EarnChainId)) {
    return parsed as EarnChainId;
  }

  return ChainId.ArbitrumOne;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { category: string; id: string };
  searchParams?: SearchParams;
}): Promise<Metadata> {
  if (!isAddress(params.id)) {
    return {
      title: 'Earn - Opportunity',
    };
  }

  try {
    const category = params.category as OpportunityCategory;
    if (OPPORTUNITY_CATEGORIES.includes(category)) {
      const chainId = getRequestedChainId(searchParams);
      const router = new CategoryRouter();
      const adapter = router.routeToAdapter(category);
      const opportunity = await adapter.getOpportunityDetails(params.id, chainId);
      const opportunityName = opportunity?.name ?? opportunity?.id ?? 'Opportunity';
      return {
        title: `Earn - ${opportunityName}`,
      };
    }
  } catch (error) {
    console.error('Error fetching opportunity metadata:', error);
  }

  return {
    title: 'Earn - Opportunity',
  };
}

export default function OpportunityDetailPageRoute({
  params,
  searchParams,
}: {
  params: { category: string; id: string };
  searchParams?: SearchParams;
}) {
  if (!isAddress(params.id)) {
    return notFound();
  }

  const category = params.category as OpportunityCategory;
  if (!OPPORTUNITY_CATEGORIES.includes(category)) {
    return notFound();
  }

  const chainId = getRequestedChainId(searchParams);

  return <OpportunityDetailPage opportunityId={params.id} category={category} chainId={chainId} />;
}
