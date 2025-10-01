import { ChevronDownIcon, FunnelIcon } from '@heroicons/react/24/outline';

import { ActiveFiltersType } from './FilterPanel';

export const FilterDropdownButton = ({
  onClick,
  activeFilters,
}: {
  onClick?: () => void;
  activeFilters?: ActiveFiltersType;
}) => {
  // Count active filters
  const activeFiltersCount = activeFilters
    ? activeFilters.categories.length +
      activeFilters.dataAvailability.length +
      activeFilters.gasToken.length +
      activeFilters.tvlBuckets.length +
      activeFilters.tpsBuckets.length +
      activeFilters.gasSpeedLimitBuckets.length
    : 0;

  return (
    <button
      className="group flex h-[40px] w-full items-center justify-between gap-1 overflow-hidden rounded-md border border-dark-gray bg-black py-[5px] pl-2 pr-1 text-sm text-white hover:bg-white hover:text-black lg:w-max lg:gap-2 lg:pl-4 lg:pr-2"
      onClick={onClick}
    >
      <div className="flex shrink-0 flex-nowrap items-center gap-2">
        <span className="flex items-center justify-center p-0.5">
          <FunnelIcon className="h-5 w-5 stroke-white group-hover:stroke-black" />
        </span>

        <span>Filters</span>

        {activeFiltersCount > 0 && (
          <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {activeFiltersCount}
          </span>
        )}
      </div>

      <span className="flex items-center justify-center p-1">
        <ChevronDownIcon className="h-3 w-3 shrink-0 stroke-white stroke-2 group-hover:stroke-black lg:h-4 lg:w-4" />
      </span>
    </button>
  );
};
