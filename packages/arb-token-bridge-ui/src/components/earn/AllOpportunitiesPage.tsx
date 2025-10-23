'use client';

import { useAllOpportunities } from '../../hooks/earn';
import { MarketOpportunitiesTable } from './MarketOpportunitiesTable';

export function AllOpportunitiesPage() {
  const { opportunities, isLoading, error } = useAllOpportunities();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-white"></div>
        <span className="ml-3 text-gray-400">Loading opportunities...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-900 bg-red-900/20 p-8 text-center">
        <p className="text-red-400">Failed to load opportunities: {error}</p>
      </div>
    );
  }

  // Empty state
  if (opportunities.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-8 text-center">
        <p className="text-gray-400">No opp ortunities available at the moment.</p>
      </div>
    );
  }

  return <MarketOpportunitiesTable opportunities={opportunities} />;
}
