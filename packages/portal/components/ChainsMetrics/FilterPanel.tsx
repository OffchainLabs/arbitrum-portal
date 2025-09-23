'use client';

import { Popover } from '@headlessui/react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

// Define TVL and TPS buckets
const TVL_BUCKETS = [
  { label: '< $1M', min: 0, max: 1000000 },
  { label: '$1M - $10M', min: 1000000, max: 10000000 },
  { label: '> $10M', min: 10000000, max: Infinity }
];

const TPS_BUCKETS = [
  { label: '< 1', min: 0, max: 1 },
  { label: '1 - 10', min: 1, max: 10 },
  { label: '> 10', min: 10, max: Infinity }
];

// Define Gas Speed Limit buckets
export const GAS_SPEED_LIMIT_BUCKETS = [
  { label: '< 1M gas/sec', min: 0, max: 1000000 },
  { label: '1M - 10M gas/sec', min: 1000000, max: 10000000 },
  { label: '> 10M gas/sec', min: 10000000, max: Infinity }
];

// Filter Panel Component types
export type FilterOptionsType = {
  categories: { id: string; name: string }[];
  dataAvailability: string[];
  gasToken: string[];
  tvlBuckets: typeof TVL_BUCKETS;
  tpsBuckets: typeof TPS_BUCKETS;
  gasSpeedLimitBuckets: typeof GAS_SPEED_LIMIT_BUCKETS;
};

export type ActiveFiltersType = {
  categories: string[];
  dataAvailability: string[];
  gasToken: string[];
  tvlBuckets: string[];
  tpsBuckets: string[];
  gasSpeedLimitBuckets: string[];
};

type FilterPanelProps = {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  filterOptions: FilterOptionsType;
  activeFilters: ActiveFiltersType;
  toggleFilter: (type: keyof ActiveFiltersType, value: string) => void;
};

import { FilterDropdownButton } from './FilterDropdownButton';

export const FilterPanel = ({ 
  filterOptions, 
  activeFilters, 
  toggleFilter 
}: Omit<FilterPanelProps, 'showFilters' | 'setShowFilters'>) => {
  
  return (
    <Popover className="relative w-full lg:w-max">
      {({ open }) => (
        <>
          <Popover.Button as="div">
            <FilterDropdownButton activeFilters={activeFilters} />
          </Popover.Button>
          
          <Popover.Panel className="fixed inset-x-4 top-20 z-50 flex max-h-[80vh] flex-col overflow-auto rounded-md bg-[#181818] p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.2)] sm:w-[600px] md:w-[700px] lg:absolute lg:inset-auto lg:right-0 lg:top-auto lg:mt-4 lg:w-[700px] lg:max-w-3xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-medium text-white">Filters</h3>
              <Popover.Button className="rounded-full p-2 text-gray-400 hover:bg-gray-700/40 hover:text-white transition-colors">
                <XMarkIcon className="h-6 w-6" />
              </Popover.Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4 lg:grid-cols-3 auto-rows-auto">
              {/* Categories filter */}
              <div className="space-y-4">
                <h4 className="text-base md:text-base font-medium text-gray-300">Categories</h4>
                <div className="flex flex-col gap-3">
                  {filterOptions.categories.map((category) => (
                    <div key={category.id} className="flex cursor-pointer items-start">
                      <input
                        type="checkbox"
                        id={category.id}
                        checked={activeFilters.categories.includes(category.id)}
                        onChange={() => toggleFilter('categories', category.id)}
                        className="peer [&:checked~label_.checkIcon]:visible [&:checked~label_span:first-child]:border-white [&:checked~label_span:first-child]:bg-white"
                        hidden
                        aria-hidden={false}
                      />
                      <label
                        htmlFor={category.id}
                        className="group flex cursor-pointer items-center gap-2 rounded-md p-1 px-3 text-left font-light text-white/50 hover:bg-white hover:text-black peer-checked:text-white hover:peer-checked:text-black"
                      >
                        <span className="flex items-center justify-center rounded-sm border border-gray-100/20 bg-default-black p-[3px] lg:p-[1px]">
                          <CheckIcon className="checkIcon invisible h-4 w-4 stroke-black stroke-[3px] lg:h-3 lg:w-3" />
                        </span>
                        <span className="text-sm">{category.name}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* TVL Buckets filter */}
              <div className="space-y-4">
                <h4 className="text-base md:text-base font-medium text-gray-300">TVL Range</h4>
                <div className="flex flex-col gap-3">
                  {filterOptions.tvlBuckets.map((bucket) => (
                    <div key={bucket.label} className="flex cursor-pointer items-start">
                      <input
                        type="checkbox"
                        id={bucket.label}
                        checked={activeFilters.tvlBuckets.includes(bucket.label)}
                        onChange={() => toggleFilter('tvlBuckets', bucket.label)}
                        className="peer [&:checked~label_.checkIcon]:visible [&:checked~label_span:first-child]:border-white [&:checked~label_span:first-child]:bg-white"
                        hidden
                        aria-hidden={false}
                      />
                      <label
                        htmlFor={bucket.label}
                        className="group flex cursor-pointer items-center gap-2 rounded-md p-1 px-3 text-left font-light text-white/50 hover:bg-white hover:text-black peer-checked:text-white hover:peer-checked:text-black"
                      >
                        <span className="flex items-center justify-center rounded-sm border border-gray-100/20 bg-default-black p-[3px] lg:p-[1px]">
                          <CheckIcon className="checkIcon invisible h-4 w-4 stroke-black stroke-[3px] lg:h-3 lg:w-3" />
                        </span>
                        <span className="text-sm">{bucket.label}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* TPS Buckets filter */}
              <div className="space-y-4">
                <h4 className="text-base md:text-base font-medium text-gray-300">TPS Range</h4>
                <div className="flex flex-col gap-3">
                  {filterOptions.tpsBuckets.map((bucket) => (
                    <div key={bucket.label} className="flex cursor-pointer items-start">
                      <input
                        type="checkbox"
                        id={bucket.label}
                        checked={activeFilters.tpsBuckets.includes(bucket.label)}
                        onChange={() => toggleFilter('tpsBuckets', bucket.label)}
                        className="peer [&:checked~label_.checkIcon]:visible [&:checked~label_span:first-child]:border-white [&:checked~label_span:first-child]:bg-white"
                        hidden
                        aria-hidden={false}
                      />
                      <label
                        htmlFor={bucket.label}
                        className="group flex cursor-pointer items-center gap-2 rounded-md p-1 px-3 text-left font-light text-white/50 hover:bg-white hover:text-black peer-checked:text-white hover:peer-checked:text-black"
                      >
                        <span className="flex items-center justify-center rounded-sm border border-gray-100/20 bg-default-black p-[3px] lg:p-[1px]">
                          <CheckIcon className="checkIcon invisible h-4 w-4 stroke-black stroke-[3px] lg:h-3 lg:w-3" />
                        </span>
                        <span className="text-sm">{bucket.label}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gas Speed Limit Buckets filter */}
              <div className="space-y-4">
                <h4 className="text-base md:text-base font-medium text-gray-300">Gas Speed Limit</h4>
                <div className="flex flex-col gap-3">
                  {filterOptions.gasSpeedLimitBuckets.map((bucket) => (
                    <div key={bucket.label} className="flex cursor-pointer items-start">
                      <input
                        type="checkbox"
                        id={bucket.label}
                        checked={activeFilters.gasSpeedLimitBuckets.includes(bucket.label)}
                        onChange={() => toggleFilter('gasSpeedLimitBuckets', bucket.label)}
                        className="peer [&:checked~label_.checkIcon]:visible [&:checked~label_span:first-child]:border-white [&:checked~label_span:first-child]:bg-white"
                        hidden
                        aria-hidden={false}
                      />
                      <label
                        htmlFor={bucket.label}
                        className="group flex cursor-pointer items-center gap-2 rounded-md p-1 px-3 text-left font-light text-white/50 hover:bg-white hover:text-black peer-checked:text-white hover:peer-checked:text-black"
                      >
                        <span className="flex items-center justify-center rounded-sm border border-gray-100/20 bg-default-black p-[3px] lg:p-[1px]">
                          <CheckIcon className="checkIcon invisible h-4 w-4 stroke-black stroke-[3px] lg:h-3 lg:w-3" />
                        </span>
                        <span className="text-sm">{bucket.label}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Availability filter */}
              <div className="space-y-4">
                <h4 className="text-base md:text-base font-medium text-gray-300">Data Availability</h4>
                <div className="flex flex-col gap-3">
                  {filterOptions.dataAvailability.map((da) => (
                    <div key={da} className="flex cursor-pointer items-start">
                      <input
                        type="checkbox"
                        id={da}
                        checked={activeFilters.dataAvailability.includes(da)}
                        onChange={() => toggleFilter('dataAvailability', da)}
                        className="peer [&:checked~label_.checkIcon]:visible [&:checked~label_span:first-child]:border-white [&:checked~label_span:first-child]:bg-white"
                        hidden
                        aria-hidden={false}
                      />
                      <label
                        htmlFor={da}
                        className="group flex cursor-pointer items-center gap-2 rounded-md p-1 px-3 text-left font-light text-white/50 hover:bg-white hover:text-black peer-checked:text-white hover:peer-checked:text-black"
                      >
                        <span className="flex items-center justify-center rounded-sm border border-gray-100/20 bg-default-black p-[3px] lg:p-[1px]">
                          <CheckIcon className="checkIcon invisible h-4 w-4 stroke-black stroke-[3px] lg:h-3 lg:w-3" />
                        </span>
                        <span className="text-sm">{da}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gas Token filter */}
              <div className="space-y-4">
                <h4 className="text-base md:text-base font-medium text-gray-300">Gas Token</h4>
                <div className="flex flex-col gap-3">
                  {filterOptions.gasToken.map((token) => (
                    <div key={token} className="flex cursor-pointer items-start">
                      <input
                        type="checkbox"
                        id={token}
                        checked={activeFilters.gasToken.includes(token)}
                        onChange={() => toggleFilter('gasToken', token)}
                        className="peer [&:checked~label_.checkIcon]:visible [&:checked~label_span:first-child]:border-white [&:checked~label_span:first-child]:bg-white"
                        hidden
                        aria-hidden={false}
                      />
                      <label
                        htmlFor={token}
                        className="group flex cursor-pointer items-center gap-2 rounded-md p-1 px-3 text-left font-light text-white/50 hover:bg-white hover:text-black peer-checked:text-white hover:peer-checked:text-black"
                      >
                        <span className="flex items-center justify-center rounded-sm border border-gray-100/20 bg-default-black p-[3px] lg:p-[1px]">
                          <CheckIcon className="checkIcon invisible h-4 w-4 stroke-black stroke-[3px] lg:h-3 lg:w-3" />
                        </span>
                        <span className="text-sm">{token}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Popover.Panel>
        </>
      )}
    </Popover>
  );
}; 