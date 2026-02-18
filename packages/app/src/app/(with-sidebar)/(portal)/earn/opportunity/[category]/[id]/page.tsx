import { Metadata } from 'next';

import { OpportunityDetailPage } from '@/app-components/earn/OpportunityDetailPage';
import { OPPORTUNITY_CATEGORIES, type OpportunityCategory } from '@/app-types/earn/vaults';
import { CategoryRouter } from '@/earn-api/CategoryRouter';

export async function generateMetadata({
  params,
}: {
  params: { category: string; id: string };
}): Promise<Metadata> {
  try {
    const category = params.category as OpportunityCategory;
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
}: {
  params: { category: string; id: string };
}) {
  return (
    <OpportunityDetailPage
      opportunityId={params.id}
      category={
        OPPORTUNITY_CATEGORIES.includes(params.category as OpportunityCategory)
          ? (params.category as OpportunityCategory)
          : undefined
      }
    />
  );
}
