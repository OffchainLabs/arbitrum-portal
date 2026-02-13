import { Popover } from '@headlessui/react';
import { ArrowsUpDownIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { usePostHog } from 'posthog-js/react';
import { twMerge } from 'tailwind-merge';

import { SortOptions } from '@/common/types';
import { useArbQueryParams } from '@/hooks/useArbQueryParams';

export const SortDropdown = () => {
  const [{ sortBy }, setQueryParams] = useArbQueryParams();
  const posthog = usePostHog();

  const setSort = (sort: SortOptions) => {
    setQueryParams({ sortBy: sort });
    posthog?.capture('Sort Dropdown Click', { sort });
  };

  return (
    <Popover className="relative w-full lg:w-max">
      <Popover.Button className="group flex h-[40px] w-full min-w-[100px] items-center justify-between gap-1 rounded-md border border-dark-gray bg-black px-1 py-[5px] text-sm text-white hover:bg-white hover:text-black lg:w-max lg:px-2">
        <div className="flex shrink-0 flex-nowrap items-center lg:gap-2 gap-1">
          <ArrowsUpDownIcon className="lg:h-5 lg:w-5 h-4 w-4" />
          <span>Sort</span>
        </div>
        <span className="flex shrink-0 items-center justify-center p-1 lg:block">
          <ChevronDownIcon className=" h-3 w-3 stroke-white stroke-2 group-hover:stroke-black lg:h-4 lg:w-4" />
        </span>
      </Popover.Button>
      <Popover.Panel className="absolute right-0 z-50 mt-4 flex max-h-[350px] w-full min-w-max flex-col overflow-scroll rounded-md bg-neutral-50 border border-neutral-200 p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.2)] lg:left-0 lg:right-auto">
        {({ close }) => {
          return (
            <div className="flex flex-col gap-2 text-left">
              <button
                className={twMerge(
                  'group flex shrink-0 grow-0 select-none flex-nowrap items-center justify-start gap-2 rounded-md p-2 text-sm no-underline hover:bg-white hover:text-black md:flex',
                  sortBy === SortOptions.LIVE_INCENTIVE && 'bg-default-black-hover',
                )}
                onClick={() => {
                  setSort(SortOptions.LIVE_INCENTIVE);
                  close();
                }}
              >
                <Image
                  src="/icons/liveIncentives.svg"
                  alt="Live Incentives"
                  width={12}
                  height={12}
                />
                Live Incentive
              </button>
              <button
                className={twMerge(
                  'group flex shrink-0 grow-0 select-none flex-nowrap items-center justify-start gap-2 rounded-md p-2 text-sm no-underline hover:bg-white hover:text-black md:flex',
                  sortBy === SortOptions.ARBITRUM_NATIVE && 'bg-default-black-hover',
                )}
                onClick={() => {
                  setSort(SortOptions.ARBITRUM_NATIVE);
                  close();
                }}
              >
                Arbitrum Native
              </button>
              <button
                className={twMerge(
                  'group flex shrink-0 grow-0 select-none flex-nowrap items-center justify-start gap-2 rounded-md p-2 text-sm no-underline hover:bg-white hover:text-black md:flex',
                  sortBy === SortOptions.ALPHABETICAL && 'bg-default-black-hover',
                )}
                onClick={() => {
                  setSort(SortOptions.ALPHABETICAL);
                  close();
                }}
              >
                Alphabetical
              </button>
            </div>
          );
        }}
      </Popover.Panel>
    </Popover>
  );
};
