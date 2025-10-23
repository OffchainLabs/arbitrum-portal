import { OpportunityDetailPage } from 'arb-token-bridge-ui/src/components/earn/OpportunityDetailPage';

export default function OpportunityDetailPageRoute({ params }: { params: { id: string } }) {
  return <OpportunityDetailPage opportunityId={params.id} />;
}
