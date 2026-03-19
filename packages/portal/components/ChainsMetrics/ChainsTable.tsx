'use client';

import { Transition } from '@headlessui/react';
import { Popover } from '@headlessui/react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Fragment } from 'react';
import ReactDOM from 'react-dom';

import { ARB_NETWORKS } from '@/common/chains';
import { DISPLAY_DATETIME_FORMAT, dayjs } from '@/common/dateUtils';
import { ORBIT_CHAINS } from '@/common/orbitChains';
import { EntityType, OrbitChain } from '@/common/types';
import { useEntitySidePanel } from '@/hooks/useEntitySidePanel';
import chainMetricsJson from '@/public/__auto-generated-chain-metrics.json';

import { FilterPanel, GAS_SPEED_LIMIT_BUCKETS } from './FilterPanel';

type ChainData = {
  slug: string;
  chainName: string;
  status: 'active' | 'coming_soon';
  tvl: number;
  tps: number;
  category: string;
  gasToken: string;
  gasTokenType: string;
  dataAvailability: string;
  features: string[];
  logoUrl: string;
  websiteUrl: string | null;
  orbitChain: OrbitChain | null;
  gasSpeedLimitPerSecond: number | null;
};

// Column definitions with tooltips
type ColumnDef = {
  key: keyof ChainData;
  title: string;
  tooltip?: string;
  sortable: boolean;
};

const COLUMN_DEFINITIONS: ColumnDef[] = [
  {
    key: 'chainName',
    title: 'Chain',
    sortable: true,
  },
  {
    key: 'category',
    title: 'Category',
    sortable: true,
  },
  {
    key: 'tvl',
    title: 'TVL',
    tooltip: 'Total Value Locked - The combined USD value of all assets locked in the chain',
    sortable: true,
  },
  {
    key: 'tps',
    title: 'TPS',
    tooltip: 'Transactions Per Second - The average number of transactions processed per second',
    sortable: true,
  },
  {
    key: 'gasToken',
    title: 'Gas Token',
    tooltip: 'The token used to pay for transactions on this chain',
    sortable: true,
  },
  {
    key: 'dataAvailability',
    title: 'Data Availability',
    tooltip:
      'The method used to store and make transaction data available (AnyTrust, Rollup, etc.)',
    sortable: true,
  },
  {
    key: 'gasSpeedLimitPerSecond',
    title: 'Gas Speed Limit',
    tooltip: 'The maximum gas per second the chain can process',
    sortable: true,
  },
];

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const tpsFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

// Category name mapping with proper capitalization and spacing
const CATEGORY_NAME_MAP: Record<string, string> = {
  'defi': 'DeFi',
  'ai-and-depin': 'AI & DePIN',
  'gaming': 'Gaming',
  'consumer': 'Consumer',
  'bridges-and-on-ramps': 'Bridges & On-Ramps',
  'infra-and-tools': 'Infrastructure & Tools',
};

// Helper function to format category names using the mapping
const formatCategoryName = (categoryId: string): string => {
  if (!categoryId) return '-';

  // Use the mapping if available, otherwise fall back to formatting
  return (
    CATEGORY_NAME_MAP[categoryId.toLowerCase()] ||
    categoryId
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
};

// Tooltip component using Headless UI
const HeaderTooltip = ({ tooltip }: { tooltip: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <Popover className="relative inline-block ml-1">
      {() => (
        <>
          <Popover.Button
            ref={buttonRef}
            className="focus:outline-none"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
            onClick={(e) => e.preventDefault()}
          >
            <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-white cursor-help" />
          </Popover.Button>

          {typeof document !== 'undefined' &&
            ReactDOM.createPortal(
              <Transition
                show={isOpen}
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
              >
                <Popover.Panel
                  static
                  className="fixed z-[99999] w-56 px-2 py-2"
                  style={{
                    left: buttonRef.current
                      ? buttonRef.current.getBoundingClientRect().left - 100
                      : 0,
                    top: buttonRef.current ? buttonRef.current.getBoundingClientRect().top - 80 : 0,
                  }}
                  onMouseEnter={() => setIsOpen(true)}
                  onMouseLeave={() => setIsOpen(false)}
                >
                  <div className="rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="relative bg-gray-800 p-2 rounded-lg">
                      <div
                        className="absolute -bottom-2 left-1/2 -ml-2 w-4 h-4 bg-gray-800"
                        style={{
                          clipPath: 'polygon(50% 100%, 0% 0%, 100% 0%)',
                        }}
                      />
                      <p className="text-xs text-white">{tooltip}</p>
                    </div>
                  </div>
                </Popover.Panel>
              </Transition>,
              document.body,
            )}
        </>
      )}
    </Popover>
  );
};

// Define TVL and TPS buckets
const TVL_BUCKETS = [
  { label: '< $1M', min: 0, max: 1000000 },
  { label: '$1M - $10M', min: 1000000, max: 10000000 },
  { label: '> $10M', min: 10000000, max: Infinity },
];

const TPS_BUCKETS = [
  { label: '< 1', min: 0, max: 1 },
  { label: '1 - 10', min: 1, max: 10 },
  { label: '> 10', min: 10, max: Infinity },
];

// Add a formatter for gas speed limit
const gasSpeedLimitFormatter = (value: number | null): string => {
  if (value === null || value === undefined || value === 0) return '-';

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B gas/sec`;
  } else if (value >= 1_000_000) {
    return `${Math.round(value / 1_000_000)}M gas/sec`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K gas/sec`;
  }

  return `${value} gas/sec`;
};

// Add Toast component before ChainsTable component
const Toast = ({
  show,
  message,
  onClose,
}: {
  show: boolean;
  message: string;
  onClose: () => void;
}) => {
  return (
    <Transition
      show={show}
      as={Fragment}
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enterTo="translate-y-0 opacity-100 sm:translate-x-0"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="fixed bottom-4 right-4 z-50">
        <div className="rounded-lg bg-[#181818] border border-gray-700 p-4 shadow-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{message}</p>
            </div>
            <div className="ml-4 flex flex-shrink-0">
              <button
                type="button"
                className="inline-flex text-gray-400 hover:text-gray-300"
                onClick={onClose}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  );
};

export const ChainsTable = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Create combined data from orbit chains and metrics
  const chainsData = useMemo(() => {
    // Create metrics lookup map
    const metricsMap = new Map(
      chainMetricsJson.content.content.map((metric) => [
        metric.slug,
        { ...metric, status: metric.status as 'active' | 'coming_soon' },
      ]),
    );

    // Prepare ARB networks with consistent data structure
    const preparedArbNetworks = ARB_NETWORKS.map((network) => ({
      ...network,
      categoryId: 'General',
      chain: {
        token: 'ETH',
        type: network.slug === 'arbitrum-one' ? 'Rollup' : 'AnyTrust',
      },
    }));

    // Combine and transform all chains
    return [...preparedArbNetworks, ...ORBIT_CHAINS]
      .map((chain) => {
        const metrics = metricsMap.get(chain.slug);
        if (!metrics) return null;

        const isOrbitChain = 'entityType' in chain && chain.entityType === EntityType.OrbitChain;

        // Extract common data
        const commonData = {
          slug: metrics.slug,
          chainName: chain.title,
          status: metrics.status,
          tvl: metrics.tvl || 0,
          tps: metrics.tps || 0,
          gasSpeedLimitPerSecond: metrics.gasSpeedLimitPerSecond || null,
        };

        if (isOrbitChain) {
          const orbitChain = chain as OrbitChain;

          // Keep original gas token for display, but add gasTokenType for filtering
          let gasToken = orbitChain.chain?.token || 'OTHER';
          if (gasToken === '-') gasToken = 'OTHER';

          // Determine token type for filtering (ETH or OTHER)
          const gasTokenType = gasToken.toUpperCase() === 'ETH' ? 'ETH' : 'OTHER';

          // Handle data availability, replacing '-' with meaningful value
          let dataAvailability = orbitChain.chain?.type || 'Unknown';
          if (dataAvailability === '-') dataAvailability = 'Unknown';

          return {
            ...commonData,
            category: orbitChain.categoryId,
            gasToken: gasToken,
            gasTokenType: gasTokenType,
            dataAvailability: dataAvailability,
            features: [],
            logoUrl: orbitChain.images.logoUrl,
            websiteUrl: orbitChain.links.website,
            orbitChain,
          };
        } else {
          const arbNetwork = chain as (typeof preparedArbNetworks)[0];
          return {
            ...commonData,
            category: arbNetwork.categoryId,
            gasToken: arbNetwork.chain.token,
            gasTokenType: arbNetwork.chain.token.toUpperCase() === 'ETH' ? 'ETH' : 'OTHER',
            dataAvailability: arbNetwork.chain.type,
            features: [],
            logoUrl: arbNetwork.logoUrl || '',
            websiteUrl: null,
            orbitChain: null,
          };
        }
      })
      .filter(Boolean) as ChainData[];
  }, []);

  // Initialize state from URL params or defaults
  const [sortField, setSortField] = useState<keyof ChainData>(() => {
    const fieldParam = searchParams.get('metricsSortField');
    // Validate that the field is a valid sortable field
    return fieldParam && COLUMN_DEFINITIONS.some((col) => col.key === fieldParam && col.sortable)
      ? (fieldParam as keyof ChainData)
      : 'tvl';
  });

  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    const dirParam = searchParams.get('metricsSortDir');
    return dirParam === 'asc' ? 'asc' : 'desc';
  });

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');

  const [activeFilters, setActiveFilters] = useState<{
    categories: string[];
    dataAvailability: string[];
    gasToken: string[];
    tvlBuckets: string[];
    tpsBuckets: string[];
    gasSpeedLimitBuckets: string[];
  }>(() => {
    return {
      categories: searchParams.get('categories')?.split(',').filter(Boolean) || [],
      dataAvailability: searchParams.get('dataAvailability')?.split(',').filter(Boolean) || [],
      gasToken: searchParams.get('gasToken')?.split(',').filter(Boolean) || [],
      tvlBuckets: searchParams.get('tvlBuckets')?.split(',').filter(Boolean) || [],
      tpsBuckets: searchParams.get('tpsBuckets')?.split(',').filter(Boolean) || [],
      gasSpeedLimitBuckets:
        searchParams.get('gasSpeedLimitBuckets')?.split(',').filter(Boolean) || [],
    };
  });

  const { openEntitySidePanel } = useEntitySidePanel(EntityType.OrbitChain);

  // Detect if device is likely mobile for UI adjustments
  const [isMobile, setIsMobile] = useState(false);

  // Set mobile detection on component mount
  useEffect(() => {
    // Simple mobile detection based on screen width
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Update on window resize
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams.toString());

    // Update or remove search param
    if (searchQuery) {
      newParams.set('search', searchQuery);
    } else {
      newParams.delete('search');
    }

    // Update or remove sort params
    newParams.set('metricsSortField', sortField);
    newParams.set('metricsSortDir', sortDirection);

    // Update or remove filter params
    Object.entries(activeFilters).forEach(([key, values]) => {
      if (values.length > 0) {
        newParams.set(key, values.join(','));
      } else {
        newParams.delete(key);
      }
    });

    // Build the new URL and navigate
    const newUrl = `${window.location.pathname}?${newParams.toString()}`;
    router.push(newUrl, { scroll: false });
  }, [searchQuery, sortField, sortDirection, activeFilters, router, searchParams]);

  const handleSort = (field: keyof ChainData) => {
    if (sortField === field) {
      // Toggle sort direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleRowClick = (slug: string) => {
    if (slug) {
      openEntitySidePanel(slug);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Filter options derived from the data
  const filterOptions = useMemo(() => {
    const categories = new Set<string>();
    const dataAvailability = new Set<string>();

    chainsData.forEach((chain) => {
      if (chain.category) categories.add(chain.category);
      if (chain.dataAvailability) dataAvailability.add(chain.dataAvailability);
    });

    return {
      categories: Array.from(categories).map((cat) => ({ id: cat, name: formatCategoryName(cat) })),
      dataAvailability: Array.from(dataAvailability).filter((da) => da !== '-'),
      gasToken: ['ETH', 'OTHER'], // Simplified gas token filter options
      tvlBuckets: TVL_BUCKETS,
      tpsBuckets: TPS_BUCKETS,
      gasSpeedLimitBuckets: GAS_SPEED_LIMIT_BUCKETS,
    };
  }, [chainsData]);

  // Toggle filter value
  const toggleFilter = (type: keyof typeof activeFilters, value: string) => {
    setActiveFilters((prev) => {
      const currentFilters = [...prev[type]];
      const index = currentFilters.indexOf(value);

      if (index === -1) {
        currentFilters.push(value);
      } else {
        currentFilters.splice(index, 1);
      }

      return { ...prev, [type]: currentFilters };
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setActiveFilters({
      categories: [],
      dataAvailability: [],
      gasToken: [],
      tvlBuckets: [],
      tpsBuckets: [],
      gasSpeedLimitBuckets: [],
    });
    setSearchQuery('');
  };

  // Manage sharing state for UI feedback
  const [isSharing, setIsSharing] = useState(false);

  // Add toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Share filters function
  const shareFilters = async () => {
    setIsSharing(true);
    const url = window.location.href;

    try {
      await navigator.clipboard.writeText(url);
      setToastMessage('URL copied to clipboard!');
      setShowToast(true);
    } catch (err) {
      setToastMessage('Failed to copy URL');
      setShowToast(true);
    } finally {
      setIsSharing(false);
      // Auto-hide toast after 3 seconds
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // Calculate cumulative stats for filtered data
  const cumulativeStats = useMemo(() => {
    const filtered = chainsData.filter((chain) => {
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesChainName = chain.chainName.toLowerCase().includes(query);
        const matchesCategory = formatCategoryName(chain.category).toLowerCase().includes(query);
        const matchesGasToken = chain.gasToken.toLowerCase().includes(query);
        const matchesDataAvailability = chain.dataAvailability.toLowerCase().includes(query);

        if (!matchesChainName && !matchesCategory && !matchesGasToken && !matchesDataAvailability) {
          return false;
        }
      }

      // Apply category filter
      if (
        activeFilters.categories.length > 0 &&
        !activeFilters.categories.includes(chain.category)
      ) {
        return false;
      }

      // Apply data availability filter
      if (
        activeFilters.dataAvailability.length > 0 &&
        !activeFilters.dataAvailability.includes(chain.dataAvailability)
      ) {
        return false;
      }

      // Apply gas token filter - using the gasTokenType for filtering
      if (activeFilters.gasToken.length > 0) {
        if (!activeFilters.gasToken.includes(chain.gasTokenType)) {
          return false;
        }
      }

      // Check if a value is within a selected bucket
      const isInBuckets = (
        value: number,
        bucketType: 'tvlBuckets' | 'tpsBuckets' | 'gasSpeedLimitBuckets',
      ) => {
        if (activeFilters[bucketType].length === 0) return true;

        const buckets =
          bucketType === 'tvlBuckets'
            ? TVL_BUCKETS
            : bucketType === 'tpsBuckets'
              ? TPS_BUCKETS
              : GAS_SPEED_LIMIT_BUCKETS;

        for (const bucketLabel of activeFilters[bucketType]) {
          const bucket = buckets.find(
            (b: { label: string; min: number; max: number }) => b.label === bucketLabel,
          );
          if (bucket && value >= bucket.min && value < bucket.max) {
            return true;
          }
        }

        return false;
      };

      // Apply TVL bucket filters
      if (!isInBuckets(chain.tvl, 'tvlBuckets')) {
        return false;
      }

      // Apply TPS bucket filters
      if (!isInBuckets(chain.tps, 'tpsBuckets')) {
        return false;
      }

      // Apply Gas Speed Limit bucket filters
      if (!isInBuckets(chain.gasSpeedLimitPerSecond || 0, 'gasSpeedLimitBuckets')) {
        return false;
      }

      return true;
    });

    // Determine if all filtered chains have the same values for each field
    const uniqueCategories = Array.from(new Set(filtered.map((chain) => chain.category)));
    const uniqueGasTokens = Array.from(new Set(filtered.map((chain) => chain.gasToken)));
    const uniqueDataAvailability = Array.from(
      new Set(filtered.map((chain) => chain.dataAvailability)),
    );

    return {
      totalTvl: filtered.reduce((sum, chain) => sum + (chain.tvl || 0), 0),
      totalTps: filtered.reduce((sum, chain) => sum + (chain.tps || 0), 0),
      chainCount: filtered.length,
      // Show specific value if all chains match, otherwise show "Mixed"
      category: uniqueCategories.length === 1 ? uniqueCategories[0] : null,
      gasToken: uniqueGasTokens.length === 1 ? uniqueGasTokens[0] : null,
      dataAvailability: uniqueDataAvailability.length === 1 ? uniqueDataAvailability[0] : null,
    };
  }, [chainsData, searchQuery, activeFilters]);

  // Apply search and filters
  const filteredChainsData = useMemo(() => {
    return chainsData.filter((chain) => {
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesChainName = chain.chainName.toLowerCase().includes(query);
        const matchesCategory = formatCategoryName(chain.category).toLowerCase().includes(query);
        const matchesGasToken = chain.gasToken.toLowerCase().includes(query);
        const matchesDataAvailability = chain.dataAvailability.toLowerCase().includes(query);

        if (!matchesChainName && !matchesCategory && !matchesGasToken && !matchesDataAvailability) {
          return false;
        }
      }

      // Apply category filter
      if (
        activeFilters.categories.length > 0 &&
        !activeFilters.categories.includes(chain.category)
      ) {
        return false;
      }

      // Apply data availability filter
      if (
        activeFilters.dataAvailability.length > 0 &&
        !activeFilters.dataAvailability.includes(chain.dataAvailability)
      ) {
        return false;
      }

      // Apply gas token filter - using the gasTokenType for filtering
      if (activeFilters.gasToken.length > 0) {
        if (!activeFilters.gasToken.includes(chain.gasTokenType)) {
          return false;
        }
      }

      // Check if a value is within a selected bucket
      const isInBuckets = (
        value: number,
        bucketType: 'tvlBuckets' | 'tpsBuckets' | 'gasSpeedLimitBuckets',
      ) => {
        if (activeFilters[bucketType].length === 0) return true;

        const buckets =
          bucketType === 'tvlBuckets'
            ? TVL_BUCKETS
            : bucketType === 'tpsBuckets'
              ? TPS_BUCKETS
              : GAS_SPEED_LIMIT_BUCKETS;

        for (const bucketLabel of activeFilters[bucketType]) {
          const bucket = buckets.find(
            (b: { label: string; min: number; max: number }) => b.label === bucketLabel,
          );
          if (bucket && value >= bucket.min && value < bucket.max) {
            return true;
          }
        }

        return false;
      };

      // Apply TVL bucket filters
      if (!isInBuckets(chain.tvl, 'tvlBuckets')) {
        return false;
      }

      // Apply TPS bucket filters
      if (!isInBuckets(chain.tps, 'tpsBuckets')) {
        return false;
      }

      // Apply Gas Speed Limit bucket filters
      if (!isInBuckets(chain.gasSpeedLimitPerSecond || 0, 'gasSpeedLimitBuckets')) {
        return false;
      }

      return true;
    });
  }, [chainsData, searchQuery, activeFilters]);

  // Memoize sorted chains data
  const sortedChainsData = useMemo(() => {
    return [...filteredChainsData].sort((a, b) => {
      if (sortField === 'tvl' || sortField === 'tps' || sortField === 'gasSpeedLimitPerSecond') {
        return sortDirection === 'asc'
          ? (a[sortField] || 0) - (b[sortField] || 0)
          : (b[sortField] || 0) - (a[sortField] || 0);
      }

      // For string fields
      const aValue = String(a[sortField] || '');
      const bValue = String(b[sortField] || '');

      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });
  }, [filteredChainsData, sortField, sortDirection]);

  // Calculate how many spacer rows to add to maintain consistent height
  const spacerRowsCount = useMemo(() => {
    // Get total possible maximum number of rows (all chains)
    const maxRows = chainsData.length;
    // Get current number of filtered rows
    const currentRows = sortedChainsData.length;
    // Return the difference to fill the space
    return Math.max(0, maxRows - currentRows);
  }, [chainsData.length, sortedChainsData.length]);

  const renderSortIcon = (field: keyof ChainData) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ArrowUpIcon className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDownIcon className="ml-1 h-4 w-4" />
    );
  };

  // Count active filters
  const activeFiltersCount =
    activeFilters.categories.length +
    activeFilters.dataAvailability.length +
    activeFilters.gasToken.length +
    activeFilters.tvlBuckets.length +
    activeFilters.tpsBuckets.length +
    activeFilters.gasSpeedLimitBuckets.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Search and filter controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search input */}
        <div className="relative flex w-full md:w-80">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full rounded-md border border-gray-700 bg-[#181818] py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            placeholder="Search chains..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery && (
            <button
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              onClick={() => setSearchQuery('')}
            >
              <XMarkIcon className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Filter buttons */}
        <div className="flex h-9 items-center gap-2">
          {/* Unified button styles */}
          {/**
           * Base: bg-[#181818] text-white border border-gray-700 rounded-md h-9 px-4 text-sm font-medium hover:bg-[#222222] transition-colors duration-150
           * Disabled: opacity-50 cursor-not-allowed text-gray-500 hover:bg-[#181818]
           * Active Filter: border-blue-500 text-blue-400 bg-blue-500/10
           */}
          <FilterPanel
            filterOptions={filterOptions}
            activeFilters={activeFilters}
            toggleFilter={toggleFilter}
          />

          <button
            className={`h-9 rounded-md border text-sm font-medium transition-colors duration-150 w-20
              ${
                activeFiltersCount === 0
                  ? 'bg-[#181818] text-gray-500 border-gray-700 opacity-50 cursor-not-allowed hover:bg-[#181818]'
                  : 'bg-[#181818] text-white border-gray-700 hover:bg-[#222222] cursor-pointer'
              }
            `}
            onClick={clearFilters}
            disabled={activeFiltersCount === 0}
            tabIndex={activeFiltersCount === 0 ? -1 : 0}
            aria-disabled={activeFiltersCount === 0}
          >
            Clear
          </button>

          <button
            className={`h-9 rounded-md border text-sm font-medium transition-colors duration-150 w-20
              ${
                isSharing
                  ? 'bg-[#181818] text-gray-500 border-gray-700 opacity-50 cursor-not-allowed hover:bg-[#181818]'
                  : 'bg-[#181818] text-white border-gray-700 hover:bg-[#222222] cursor-pointer'
              }
            `}
            onClick={shareFilters}
            disabled={isSharing}
          >
            {isSharing ? (isMobile ? 'Sharing...' : 'Sharing...') : 'Share'}
          </button>
        </div>
      </div>

      {/* Table stats bar - fixed height to prevent jumping */}
      <div className="overflow-visible">
        <div className="mb-2 flex h-6 items-center justify-between">
          <div className="h-6">
            {filteredChainsData.length > 0 && (
              <span className="text-sm text-gray-400">
                Showing {filteredChainsData.length} of {chainsData.length} chains
              </span>
            )}
          </div>
          <span className="text-xs italic opacity-70">
            Last updated:{' '}
            {dayjs(chainMetricsJson.content.lastUpdated).format(DISPLAY_DATETIME_FORMAT)} UTC
          </span>
        </div>

        {/* Table with consistent height regardless of filter results */}
        <div className="overflow-x-auto overflow-y-visible rounded-md">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                {COLUMN_DEFINITIONS.map((column) => (
                  <th
                    key={column.key}
                    className={`cursor-pointer bg-[#222222] px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-300 ${
                      column.key === 'chainName' ? 'pl-16' : ''
                    } relative overflow-visible`}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <span className="flex items-center overflow-visible">
                      {column.title} {column.sortable && renderSortIcon(column.key)}
                      {column.tooltip && <HeaderTooltip tooltip={column.tooltip} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="min-h-[200px]">
              {/* Summary totals row at the top */}
              {cumulativeStats.chainCount > 0 && (
                <tr className="bg-neutralu-900/90 border-b border-white/50">
                  <td className="px-6 py-3 text-sm text-blue-400/70">
                    <div className="flex items-center">
                      <div className="mr-4 h-6 w-6 flex-shrink-0">
                        <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <span className="text-xs text-blue-400/70">Σ</span>
                        </div>
                      </div>
                      <span className="text-gray-400/90">Total</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-400/90">
                    {cumulativeStats.category
                      ? formatCategoryName(cumulativeStats.category)
                      : 'Mixed Categories'}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-400/90 tabular-nums">
                    {formatter.format(cumulativeStats.totalTvl)}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-400/90 tabular-nums">
                    {tpsFormatter.format(cumulativeStats.totalTps)}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-400/90">
                    {cumulativeStats.gasToken || 'Mixed'}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-400/90">
                    {cumulativeStats.dataAvailability || 'Mixed'}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-400/90">-</td>
                </tr>
              )}

              {sortedChainsData.length === 0 ? (
                <>
                  <tr>
                    <td
                      colSpan={COLUMN_DEFINITIONS.length}
                      className="h-16 px-6 py-4 text-center text-sm font-medium text-gray-300"
                    >
                      {searchQuery || activeFiltersCount > 0
                        ? 'No chains match your search or filters'
                        : 'No chain data available'}
                    </td>
                  </tr>
                  {/* Add completely invisible spacer rows to maintain full height when no results */}
                  {Array.from({ length: chainsData.length - 1 }).map((_, index) => (
                    <tr key={`empty-spacer-${index}`} className="h-[52px] border-none">
                      <td
                        colSpan={COLUMN_DEFINITIONS.length}
                        className="bg-transparent border-none"
                      />
                    </tr>
                  ))}
                </>
              ) : (
                <>
                  {sortedChainsData.map((chain, index) => {
                    return (
                      <tr
                        key={index}
                        className={`group border-b border-gray-800 transition-colors duration-150 hover:bg-[#222222] ${
                          chain.category !== 'General' ? 'cursor-pointer' : ''
                        }`}
                        onClick={() => chain.category !== 'General' && handleRowClick(chain.slug)}
                      >
                        <td className="bg-[#181818] px-6 py-3 text-sm text-white transition-colors duration-150 group-hover:bg-[#222222]">
                          <div className="flex items-center">
                            <div className="mr-4 h-6 w-6 flex-shrink-0">
                              {chain.logoUrl ? (
                                <Image
                                  src={chain.logoUrl}
                                  alt={`${chain.chainName} Logo`}
                                  width={24}
                                  height={24}
                                  className="rounded-full"
                                />
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-gray-700" />
                              )}
                            </div>
                            <span>{chain.chainName}</span>
                          </div>
                        </td>
                        <td className="bg-[#181818] px-6 py-3 text-sm text-gray-300 transition-colors duration-150 group-hover:bg-[#222222]">
                          {formatCategoryName(chain.category)}
                        </td>
                        <td className="bg-[#181818] px-6 py-3 text-sm text-gray-300 transition-colors duration-150 group-hover:bg-[#222222] tabular-nums">
                          {chain.tvl > 0 ? formatter.format(chain.tvl) : '$0'}
                        </td>
                        <td className="bg-[#181818] px-6 py-3 text-sm text-gray-300 transition-colors duration-150 group-hover:bg-[#222222] tabular-nums">
                          {chain.tps > 0 ? tpsFormatter.format(chain.tps) : '-'}
                        </td>
                        <td className="bg-[#181818] px-6 py-3 text-sm text-gray-300 transition-colors duration-150 group-hover:bg-[#222222]">
                          {chain.gasToken}
                        </td>
                        <td className="bg-[#181818] px-6 py-3 text-sm text-gray-300 transition-colors duration-150 group-hover:bg-[#222222]">
                          {chain.dataAvailability}
                        </td>
                        <td className="bg-[#181818] px-6 py-3 text-sm text-gray-300 transition-colors duration-150 group-hover:bg-[#222222]">
                          {gasSpeedLimitFormatter(chain.gasSpeedLimitPerSecond)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Add completely invisible spacer rows to maintain full height when filtered */}
                  {spacerRowsCount > 0 &&
                    Array.from({ length: spacerRowsCount }).map((_, index) => (
                      <tr key={`spacer-${index}`} className="h-[52px] border-none">
                        {Array.from({ length: COLUMN_DEFINITIONS.length }).map((_, colIndex) => (
                          <td
                            key={`spacer-cell-${colIndex}`}
                            className="bg-transparent border-none"
                          />
                        ))}
                      </tr>
                    ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center text-xs italic text-gray-500">
        Data is updated daily. Features are added based on Arbitrum technology adoption.
      </div>

      {/* Add Toast component before the closing div */}
      <Toast show={showToast} message={toastMessage} onClose={() => setShowToast(false)} />
    </div>
  );
};
