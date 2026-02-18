import { Metadata } from 'next';

import { OpportunityDetailPage } from '@/app-components/earn/OpportunityDetailPage';
import { CategoryRouter } from '@/earn-api/CategoryRouter';
import { OPPORTUNITY_CATEGORIES, OpportunityCategory } from '@/earn-api/types';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { category?: OpportunityCategory };
}): Promise<Metadata> {
  const category = searchParams.category;
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
  searchParams: { category?: OpportunityCategory };
}) {
  const category =
    searchParams.category && OPPORTUNITY_CATEGORIES.includes(searchParams.category)
      ? searchParams.category
      : undefined;
  return <OpportunityDetailPage opportunityId={params.id} category={category} />;
}
