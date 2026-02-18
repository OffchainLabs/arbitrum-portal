'use client';

import { ChevronDownIcon, ChevronUpIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useCallback, useMemo, useState } from 'react';

import {
  OpportunityCategory,
  OpportunityTableRow,
  getCategoryDisplayName,
} from '@/app-types/earn/vaults';
import { Button } from '@/bridge/components/common/Button';
import { Tooltip } from '@/bridge/components/common/Tooltip';

import { OpportunityCard } from './OpportunityCard';
import { OpportunityRow } from './OpportunityRow';

interface OpportunitiesTableProps {
  opportunities: OpportunityTableRow[];
  groupByCategory?: boolean;
}

type GroupedOpportunities = Record<OpportunityCategory, OpportunityTableRow[]>;

type SortColumn = 'apy' | 'tvl' | null;
type SortDirection = 'asc' | 'desc';

const MAX_DISPLAYED_OPPORTUNITIES = 3;

export function OpportunitiesTable({
  opportunities,
  groupByCategory = false,
}: OpportunitiesTableProps) {
  // Track which categories are expanded (using category values, not display names)
  const [expandedCategories, setExpandedCategories] = useState<Set<OpportunityCategory>>(new Set());

  // Track sort state - default to TVL descending (prioritize stable, high-TVL vaults)
  const [sortColumn, setSortColumn] = useState<SortColumn>('tvl');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const toggleCategory = useCallback((category: OpportunityCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleSort = useCallback(
    (column: 'apy' | 'tvl') => {
      if (sortColumn === column) {
        // Toggle direction if clicking the same column
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        // Set new column and default to descending
        setSortColumn(column);
        setSortDirection('desc');
      }
    },
    [sortColumn, sortDirection],
  );

  // Group opportunities by category value (not display name)
  const groupedOpportunities = useMemo(() => {
    if (!groupByCategory) {
      return null;
    }

    const groups: Partial<GroupedOpportunities> = {};

    opportunities.forEach((opportunity) => {
      const category = opportunity.category;
      groups[category] = (groups[category] ?? []).concat(opportunity);
    });

    // Sort each group based on current sort state
    (Object.keys(groups) as OpportunityCategory[]).forEach((category) => {
      const group = groups[category];
      if (group) {
        let sorted = group;
        if (sortColumn) {
          sorted = [...group].sort((a, b) => {
            let comparison = 0;

            if (sortColumn === 'apy') {
              comparison = a.rawApy - b.rawApy;
            } else if (sortColumn === 'tvl') {
              comparison = a.rawTvl - b.rawTvl;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
          });
        }
        groups[category] = sorted;
      }
    });

    return groups;
  }, [opportunities, groupByCategory, sortColumn, sortDirection]);

  const categoryOrder: OpportunityCategory[] = ['lend'];

  const getCategoryDescription = (category: OpportunityCategory): string => {
    const descriptions: Record<OpportunityCategory, string> = {
      lend: 'Lend your tokens to borrowers and earn interest. Your tokens are used as collateral and you receive regular interest payments.',
    };
    return descriptions[category];
  };

  // Helper function to parse USD string to number for sorting
  const parseUsdValue = (usdString: string): number => {
    if (!usdString || usdString === '-') return 0;
    const cleaned = usdString.replace(/[$,]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Sort opportunities by deposited USD value (Your Holdings) if not grouped
  const sortedOpportunities = useMemo(() => {
    if (groupByCategory) return null;

    // If sorting by APY or TVL, use that; otherwise sort by deposited USD
    if (sortColumn) {
      return [...opportunities].sort((a, b) => {
        let comparison = 0;

        if (sortColumn === 'apy') {
          comparison = a.rawApy - b.rawApy;
        } else if (sortColumn === 'tvl') {
          comparison = a.rawTvl - b.rawTvl;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return [...opportunities].sort((a, b) => {
      const aValue = parseUsdValue(a.depositedUsd);
      const bValue = parseUsdValue(b.depositedUsd);
      // Sort by deposited USD descending (largest positions first)
      return bValue - aValue;
    });
  }, [opportunities, groupByCategory, sortColumn, sortDirection]);

  // Render table header
  const renderTableHeader = () => {
    const isApyActive = sortColumn === 'apy';
    const isTvlActive = sortColumn === 'tvl';

    return (
      <div className="hidden md:flex gap-4 items-center pt-4 px-4 pb-0">
        <div className="w-[150px] shrink-0">
          <p className="text-xs font-semibold text-white opacity-50 whitespace-nowrap">Name</p>
        </div>
        <div className="w-[146px] shrink-0">
          <p className="text-xs font-semibold text-white opacity-50 whitespace-nowrap">Token</p>
        </div>
        <div className="flex-1 flex gap-2 items-center min-w-0">
          <button
            onClick={() => handleSort('apy')}
            className="flex gap-2 items-center min-w-0 cursor-pointer hover:opacity-75 transition-opacity"
          >
            <p
              className={`text-xs whitespace-nowrap ${
                isApyActive ? 'font-bold text-white' : 'font-semibold text-white opacity-50'
              }`}
            >
              APY
            </p>
            {isApyActive &&
              (sortDirection === 'asc' ? (
                <ChevronUpIcon className="h-3 w-3 text-white shrink-0" />
              ) : (
                <ChevronDownIcon className="h-3 w-3 text-white shrink-0" />
              ))}
          </button>
        </div>
        <div className="flex-1 flex gap-2.5 items-center min-w-0">
          <p className="text-xs font-semibold text-white opacity-50 whitespace-nowrap">
            Your Holdings
          </p>
        </div>
        <div className="flex-1 flex gap-2.5 items-center min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-white opacity-50 whitespace-nowrap">
              Estd. Earnings
            </p>
            <Tooltip
              content={
                <div className="p-2 bg-neutral-100 rounded max-w-[200px]">
                  <p className="text-xs text-white leading-relaxed">
                    Estimated earnings are calculated using current APY rates. Actual earnings may
                    vary and are not guaranteed, as APY rates can change over time.
                  </p>
                </div>
              }
              tippyProps={{ placement: 'top' }}
            >
              <div className="flex items-center justify-center cursor-pointer">
                <InformationCircleIcon className="h-3.5 w-3.5 text-white opacity-50 hover:opacity-70" />
              </div>
            </Tooltip>
          </div>
        </div>
        <div className="w-[116px] shrink-0 flex gap-2 items-center">
          <button
            onClick={() => handleSort('tvl')}
            className="flex gap-2 items-center min-w-0 cursor-pointer hover:opacity-75 transition-opacity"
          >
            <p
              className={`text-xs whitespace-nowrap ${
                isTvlActive ? 'font-bold text-white' : 'font-normal text-white opacity-50'
              }`}
            >
              TVL
            </p>
            {isTvlActive &&
              (sortDirection === 'asc' ? (
                <ChevronUpIcon className="h-3 w-3 text-white shrink-0" />
              ) : (
                <ChevronDownIcon className="h-3 w-3 text-white shrink-0" />
              ))}
          </button>
        </div>
        <div className="flex-1 flex gap-2 items-center min-w-0">
          <p className="text-xs font-semibold text-white opacity-50 whitespace-nowrap">Protocol</p>
        </div>
        <div className="w-[42px] shrink-0"></div>
      </div>
    );
  };

  if (groupByCategory && groupedOpportunities) {
    return (
      <div className="flex flex-col gap-8">
        {categoryOrder.map((category) => {
          const categoryOpportunities = groupedOpportunities[category];
          if (!categoryOpportunities || categoryOpportunities.length === 0) {
            return null;
          }

          const isExpanded = expandedCategories.has(category);
          const hasMore = categoryOpportunities.length > MAX_DISPLAYED_OPPORTUNITIES;
          const displayedOpportunities = isExpanded
            ? categoryOpportunities
            : categoryOpportunities.slice(0, MAX_DISPLAYED_OPPORTUNITIES);

          return (
            <div key={category}>
              {/* Category Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">
                    {getCategoryDisplayName(category)}
                  </h2>
                  <Tooltip
                    content={
                      <div className="p-2 bg-neutral-100 rounded max-w-[250px]">
                        <p className="text-xs text-white leading-relaxed">
                          {getCategoryDescription(category)}
                        </p>
                      </div>
                    }
                    tippyProps={{ placement: 'top' }}
                  >
                    <div className="flex items-center justify-center cursor-pointer">
                      <InformationCircleIcon className="h-4 w-4 text-white opacity-50 hover:opacity-70" />
                    </div>
                  </Tooltip>
                </div>

                {/* View More/Less Toggle */}
                {hasMore && (
                  <div className="flex justify-end">
                    <Button onClick={() => toggleCategory(category)} variant="tertiary">
                      <span className="flex items-center gap-2">
                        {isExpanded ? 'View Less' : 'View More'}
                        <ChevronDownIcon
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Opportunities Table */}
              <div>
                {/* Mobile Cards */}
                <div className="flex flex-col gap-1 md:hidden">
                  {displayedOpportunities.map((opportunity) => (
                    <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                  ))}
                </div>
                {/* Desktop Table */}
                <div className="hidden md:flex overflow-x-auto">
                  <div className="flex flex-col gap-1 min-w-[900px] w-full">
                    {renderTableHeader()}
                    {displayedOpportunities.map((opportunity) => (
                      <OpportunityRow key={opportunity.id} opportunity={opportunity} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Render ungrouped view (Your Holdings)
  if (sortedOpportunities) {
    return (
      <div>
        {/* Mobile Cards */}
        <div className="flex flex-col gap-1 md:hidden">
          {sortedOpportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
        {/* Desktop Table */}
        <div className="hidden md:flex overflow-x-auto">
          <div className="flex flex-col gap-1 min-w-[900px] w-full">
            {renderTableHeader()}
            {sortedOpportunities.map((opportunity) => (
              <OpportunityRow key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Export MarketOpportunitiesTable for backward compatibility
export function MarketOpportunitiesTable({
  opportunities,
}: {
  opportunities: OpportunityTableRow[];
}) {
  return <OpportunitiesTable opportunities={opportunities} groupByCategory={true} />;
}
