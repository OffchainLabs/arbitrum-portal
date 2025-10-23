'use client';

import { useMemo } from 'react';

import { OpportunityTableRow } from '../../types/vaults';
import { OpportunityRow } from './OpportunityRow';

interface MarketOpportunitiesTableProps {
  opportunities: OpportunityTableRow[];
}

interface GroupedOpportunities {
  [category: string]: OpportunityTableRow[];
}

export function MarketOpportunitiesTable({ opportunities }: MarketOpportunitiesTableProps) {
  // Group opportunities by category (type field: "Liquid Staking", "Lend", "Fixed Yield")
  const groupedOpportunities = useMemo(() => {
    const groups: GroupedOpportunities = {};

    opportunities.forEach((opportunity) => {
      const category = opportunity.type; // Use the type field for categorization
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(opportunity);
    });

    // Sort each group by APY (descending)
    Object.keys(groups).forEach((category) => {
      groups[category]?.sort((a, b) => b.rawApy - a.rawApy);
    });

    return groups;
  }, [opportunities]);

  // Category display names and order
  const categoryOrder = ['Lend', 'Liquid Staking', 'Fixed Yield'];
  const categoryDisplayNames: { [key: string]: string } = {
    'Lend': 'Lend',
    'Liquid Staking': 'Liquid Staking',
    'Fixed Yield': 'Fixed Yield',
  };

  return (
    <div className="space-y-8">
      {categoryOrder.map((category) => {
        const categoryOpportunities = groupedOpportunities[category];
        if (!categoryOpportunities || categoryOpportunities.length === 0) {
          return null;
        }

        return (
          <div key={category}>
            {/* Category Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {categoryDisplayNames[category] || category}
              </h2>
              <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-white">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            </div>

            {/* Opportunities Table */}
            <div className="overflow-x-auto rounded-lg bg-gray-900/50">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="w-[15%] py-4 pl-6 pr-4 font-medium">Name</th>
                    <th className="w-[18%] py-4 pr-4 font-medium">Token</th>
                    <th className="w-[12%] py-4 pr-4 font-medium">
                      {category === 'Fixed Yield' ? 'Fixed APY' : 'APY'}
                    </th>
                    <th className="w-[15%] py-4 pr-4 font-medium">Deposited</th>
                    <th className="w-[12%] py-4 pr-4 font-medium">Earnings</th>
                    <th className="w-[13%] py-4 pr-4 font-medium">TVL</th>
                    <th className="w-[13%] py-4 pr-4 font-medium">Protocol</th>
                    <th className="w-[2%] py-4 pr-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {categoryOpportunities.map((opportunity) => (
                    <OpportunityRow
                      key={opportunity.id}
                      opportunity={opportunity}
                      showDepositedEarnings={false}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
