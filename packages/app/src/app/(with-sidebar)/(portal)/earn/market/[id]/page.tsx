import { Metadata } from 'next';

import { OpportunityDetailPage } from '@/app-components/earn/OpportunityDetailPage';
import { CategoryRouter } from '@/earn-api/CategoryRouter';
import { OPPORTUNITY_CATEGORIES, OpportunityCategory } from '@/earn-api/types';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { category?: string };
}): Promise<Metadata> {
  const category = searchParams.category as OpportunityCategory | undefined;
  if (!category) {
    return {
      title: 'Earn - Opportunity',
    };
  }

  try {
    if (OPPORTUNITY_CATEGORIES.includes(category)) {
      const router = new CategoryRouter();
      const adapter = router.routeToAdapter(category);
      const opportunity = await adapter.getOpportunityDetails(params.id, 'arbitrum');
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
  params: { id: string };
  searchParams: { category?: string };
}) {
  return (
    <OpportunityDetailPage
      opportunityId={params.id}
      category={
        searchParams.category &&
        OPPORTUNITY_CATEGORIES.includes(searchParams.category as OpportunityCategory)
          ? (searchParams.category as OpportunityCategory)
          : undefined
      }
    />
  );
}
