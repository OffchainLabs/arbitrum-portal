'use client';

import { ChevronDownIcon, ChevronUpIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useMemo, useState } from 'react';

import { Tooltip } from '@/app-components/Tooltip';
import {
  OpportunityCategory,
  type OpportunitySelectHandler,
  OpportunityTableRow,
  getCategoryDisplayName,
} from '@/app-types/earn/vaults';
import { Button } from '@/bridge/components/common/Button';

import { OpportunityCard } from './OpportunityCard';
import { OpportunityRow } from './OpportunityRow';

interface OpportunitiesTableProps {
  opportunities: OpportunityTableRow[];
  groupByCategory?: boolean;
  onOpportunitySelect?: OpportunitySelectHandler;
}

type GroupedOpportunities = Record<OpportunityCategory, OpportunityTableRow[]>;

type SortColumn = 'apy' | 'holdings' | 'projectedEarnings' | 'tvl' | null;
type SortDirection = 'asc' | 'desc';

const MAX_DISPLAYED_OPPORTUNITIES = 3;
const CATEGORY_ORDER: OpportunityCategory[] = [
  OpportunityCategory.Lend,
  OpportunityCategory.LiquidStaking,
  OpportunityCategory.FixedYield,
];
const CATEGORY_DESCRIPTIONS: Record<OpportunityCategory, string> = {
  [OpportunityCategory.Lend]:
    'Supply assets like WETH, USDC, and WBTC on Arbitrum lending markets to earn variable yield.',
  [OpportunityCategory.LiquidStaking]:
    'Stake ETH on Arbitrum and receive liquid staking tokens like weETH and wstETH while keeping liquidity.',
  [OpportunityCategory.FixedYield]:
    'Access fixed-rate opportunities on Arbitrum through Pendle markets with a clear maturity date.',
};

interface SortableColumnHeaderProps {
  column: NonNullable<SortColumn>;
  label: string;
  isActive: boolean;
  sortDirection: SortDirection;
  onSort: (column: NonNullable<SortColumn>) => void;
}

function SortableColumnHeader({
  column,
  label,
  isActive,
  sortDirection,
  onSort,
}: SortableColumnHeaderProps) {
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="flex gap-2 items-center min-w-0 cursor-pointer hover:opacity-75 transition-opacity"
    >
      <p
        className={`text-xs whitespace-nowrap ${
          isActive ? 'font-bold text-white' : 'font-semibold text-white opacity-50'
        }`}
      >
        {label}
      </p>
      {isActive ? (
        sortDirection === 'asc' ? (
          <ChevronUpIcon className="h-3 w-3 text-white shrink-0" />
        ) : (
          <ChevronDownIcon className="h-3 w-3 text-white shrink-0" />
        )
      ) : (
        <ChevronDownIcon className="h-3 w-3 text-white opacity-50 shrink-0" />
      )}
    </button>
  );
}

interface TableHeaderProps {
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: NonNullable<SortColumn>) => void;
}

function TableHeader({ sortColumn, sortDirection, onSort }: TableHeaderProps) {
  return (
    <div className="hidden md:flex gap-4 items-center pt-4 px-4 pb-0">
      <div className="w-[150px] shrink-0">
        <p className="text-xs font-semibold text-white opacity-50 whitespace-nowrap">Name</p>
      </div>
      <div className="w-[146px] shrink-0">
        <p className="text-xs font-semibold text-white opacity-50 whitespace-nowrap">Token</p>
      </div>
      <div className="flex-1 flex gap-2 items-center min-w-0">
        <SortableColumnHeader
          column="apy"
          label="APY"
          isActive={sortColumn === 'apy'}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </div>
      <div className="flex-1 flex gap-2.5 items-center min-w-0">
        <SortableColumnHeader
          column="holdings"
          label="Your Holdings"
          isActive={sortColumn === 'holdings'}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </div>
      <div className="flex-1 flex gap-2.5 items-center min-w-0">
        <div className="flex items-center gap-2">
          <SortableColumnHeader
            column="projectedEarnings"
            label="Proj. Earnings"
            isActive={sortColumn === 'projectedEarnings'}
            sortDirection={sortDirection}
            onSort={onSort}
          />
          <Tooltip
            content={
              <p className="text-xs text-white leading-relaxed">
                Projected earnings are annualized estimates based on current APY rates. Actual
                earnings may vary and are not guaranteed, as APY rates can change over time.
              </p>
            }
            tippyProps={{
              placement: 'top',
            }}
          >
            <div className="flex items-center justify-center cursor-pointer">
              <InformationCircleIcon className="h-3.5 w-3.5 text-white opacity-50 hover:opacity-70" />
            </div>
          </Tooltip>
        </div>
      </div>
      <div className="w-[116px] shrink-0 flex gap-2 items-center">
        <SortableColumnHeader
          column="tvl"
          label="TVL"
          isActive={sortColumn === 'tvl'}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </div>
      <div className="flex-1 flex gap-2 items-center min-w-0">
        <p className="text-xs font-semibold text-white opacity-50 whitespace-nowrap">Protocol</p>
      </div>
      <div className="w-[42px] shrink-0"></div>
    </div>
  );
}

export function OpportunitiesTable({
  opportunities,
  groupByCategory = false,
  onOpportunitySelect,
}: OpportunitiesTableProps) {
  const posthog = usePostHog();
  const [expandedCategories, setExpandedCategories] = useState<Set<OpportunityCategory>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn>(groupByCategory ? 'tvl' : 'holdings');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const compareMetric = useCallback(
    (aValue: number | null, bValue: number | null) => {
      if (aValue === null && bValue === null) {
        return 0;
      }
      if (aValue === null) {
        return 1;
      }
      if (bValue === null) {
        return -1;
      }
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    },
    [sortDirection],
  );

  const visibleOpportunities = useMemo(() => opportunities, [opportunities]);

  const toggleCategory = useCallback(
    (category: OpportunityCategory) => {
      const nextExpanded = !expandedCategories.has(category);
      const next = new Set(expandedCategories);

      if (nextExpanded) {
        next.add(category);
      } else {
        next.delete(category);
      }

      setExpandedCategories(next);
      posthog?.capture('Earn Opportunity Section Toggled', {
        page: 'Earn',
        section: getCategoryDisplayName(category),
        category,
        expanded: nextExpanded,
      });
    },
    [expandedCategories, posthog],
  );

  const handleSort = useCallback(
    (column: NonNullable<SortColumn>) => {
      const nextSortDirection =
        sortColumn === column ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'desc';

      if (sortColumn === column) {
        setSortDirection(nextSortDirection);
      } else {
        setSortColumn(column);
        setSortDirection(nextSortDirection);
      }

      posthog?.capture('Earn Opportunities Sorted', {
        page: 'Earn',
        section: 'All Opportunities',
        sortColumn: column,
        sortDirection: nextSortDirection,
      });
    },
    [posthog, sortColumn, sortDirection],
  );

  const groupedOpportunities = useMemo(() => {
    if (!groupByCategory) {
      return null;
    }

    const groups: Partial<GroupedOpportunities> = {};

    visibleOpportunities.forEach((opportunity) => {
      const category = opportunity.category;
      groups[category] = (groups[category] ?? []).concat(opportunity);
    });

    (Object.keys(groups) as OpportunityCategory[]).forEach((category) => {
      const group = groups[category];
      if (group) {
        let sorted = group;
        if (sortColumn) {
          sorted = [...group].sort((a, b) => {
            const compareByName = a.name.localeCompare(b.name);

            if (sortColumn === 'apy') {
              const metricComparison = compareMetric(a.rawApy, b.rawApy);
              return metricComparison !== 0 ? metricComparison : compareByName;
            }
            if (sortColumn === 'holdings') {
              const metricComparison = compareMetric(a.depositedUsd, b.depositedUsd);
              return metricComparison !== 0 ? metricComparison : compareByName;
            }
            if (sortColumn === 'projectedEarnings') {
              const metricComparison = compareMetric(
                a.projectedEarningsUsd,
                b.projectedEarningsUsd,
              );
              return metricComparison !== 0 ? metricComparison : compareByName;
            }
            const metricComparison = compareMetric(a.rawTvl, b.rawTvl);
            return metricComparison !== 0 ? metricComparison : compareByName;
          });
        }
        groups[category] = sorted;
      }
    });

    return groups;
  }, [visibleOpportunities, groupByCategory, sortColumn, compareMetric]);

  const sortedOpportunities = useMemo(() => {
    if (groupByCategory) return null;

    if (sortColumn) {
      return [...opportunities].sort((a, b) => {
        const compareByName = a.name.localeCompare(b.name);

        if (sortColumn === 'apy') {
          const metricComparison = compareMetric(a.rawApy, b.rawApy);
          return metricComparison !== 0 ? metricComparison : compareByName;
        }
        if (sortColumn === 'holdings') {
          const metricComparison = compareMetric(a.depositedUsd, b.depositedUsd);
          return metricComparison !== 0 ? metricComparison : compareByName;
        }
        if (sortColumn === 'projectedEarnings') {
          const metricComparison = compareMetric(a.projectedEarningsUsd, b.projectedEarningsUsd);
          return metricComparison !== 0 ? metricComparison : compareByName;
        }
        const metricComparison = compareMetric(a.rawTvl, b.rawTvl);
        return metricComparison !== 0 ? metricComparison : compareByName;
      });
    }

    return [...opportunities].sort((a, b) => {
      const aValue = a.depositedUsd ?? 0;
      const bValue = b.depositedUsd ?? 0;
      return bValue - aValue;
    });
  }, [opportunities, groupByCategory, sortColumn, compareMetric]);

  if (groupByCategory && groupedOpportunities) {
    return (
      <div className="flex flex-col gap-8">
        {CATEGORY_ORDER.map((category) => {
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
              <div className="mb-4 flex items-center justify-between top-[60px] sticky bg-black/70 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {getCategoryDisplayName(category)}
                    </h2>
                    <p className="sr-only">{CATEGORY_DESCRIPTIONS[category]}</p>
                  </div>
                  <Tooltip
                    content={
                      <p className="text-xs text-white leading-relaxed">
                        {CATEGORY_DESCRIPTIONS[category]}
                      </p>
                    }
                    tippyProps={{
                      placement: 'top',
                    }}
                  >
                    <div className="flex items-center justify-center cursor-pointer">
                      <InformationCircleIcon className="h-4 w-4 text-white opacity-50 hover:opacity-70" />
                    </div>
                  </Tooltip>
                </div>

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

              <div>
                <div className="flex flex-col gap-1 md:hidden">
                  {displayedOpportunities.map((opportunity) => (
                    <OpportunityCard
                      key={opportunity.id}
                      opportunity={opportunity}
                      onOpportunitySelect={onOpportunitySelect}
                    />
                  ))}
                </div>
                <div className="hidden md:flex overflow-x-auto">
                  <div className="flex flex-col gap-1 min-w-[900px] w-full">
                    <TableHeader
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    {displayedOpportunities.map((opportunity) => (
                      <OpportunityRow
                        key={opportunity.id}
                        opportunity={opportunity}
                        onOpportunitySelect={onOpportunitySelect}
                      />
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

  if (sortedOpportunities) {
    return (
      <div>
        <div className="flex flex-col gap-1 md:hidden">
          {sortedOpportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              onOpportunitySelect={onOpportunitySelect}
            />
          ))}
        </div>
        <div className="hidden md:flex overflow-x-auto">
          <div className="flex flex-col gap-1 min-w-[900px] w-full">
            <TableHeader
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            {sortedOpportunities.map((opportunity) => (
              <OpportunityRow
                key={opportunity.id}
                opportunity={opportunity}
                onOpportunitySelect={onOpportunitySelect}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
