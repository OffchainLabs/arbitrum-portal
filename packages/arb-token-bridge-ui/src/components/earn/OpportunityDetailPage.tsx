'use client';

import Link from 'next/link';

interface OpportunityDetailPageProps {
  opportunityId: string;
}

export function OpportunityDetailPage({ opportunityId }: OpportunityDetailPageProps) {
  return (
    <div>
      <Link href="/earn/market" className="mb-6 inline-block text-blue-500 hover:text-blue-400">
        ← Back to Market
      </Link>
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-6">
        <h1 className="mb-4 text-2xl font-bold text-white">Opportunity Details</h1>
        <p className="text-gray-400">Opportunity ID: {opportunityId}</p>
        <p className="mt-4 text-gray-400">
          Detailed opportunity information and interaction options will be implemented here.
        </p>
      </div>
    </div>
  );
}
