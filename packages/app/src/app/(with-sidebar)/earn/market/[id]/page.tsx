'use client';

import { LiquidStakingOpportunityDetail } from 'arb-token-bridge-ui/src/components/earn/LiquidStakingOpportunityDetail';
import Link from 'next/link';

export default function OpportunityDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <Link href="/earn/market" className="mb-6 inline-block text-blue-500 hover:text-blue-400">
        ← Back to Market
      </Link>
      <LiquidStakingOpportunityDetail opportunityId={params.id} />
    </div>
  );
}
