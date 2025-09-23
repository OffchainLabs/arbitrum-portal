import { Popover } from '@headlessui/react';
import { ChevronDownIcon, LinkIcon } from '@heroicons/react/24/outline';
import { NetworkOptionList } from './NetworkOptionList';

export const NetworkDropdown = () => {
  return (
    <Popover className="relative w-full lg:w-max">
      <Popover.Button className="group flex h-[40px] w-full min-w-[100px] items-center justify-between gap-1 rounded-md border border-dark-gray bg-black px-1 py-[5px] text-sm text-white hover:bg-white hover:text-black lg:w-max lg:px-2">
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          <span className="flex items-center justify-center p-0.5">
            <LinkIcon className="h-5 w-5 stroke-white group-hover:stroke-black" />
          </span>

          <span>Chains</span>
        </div>
        <span className="flex shrink-0 items-center justify-center p-1 lg:block">
          <ChevronDownIcon className=" h-3 w-3 stroke-white stroke-2 group-hover:stroke-black lg:h-4 lg:w-4" />
        </span>
      </Popover.Button>
      <Popover.Panel className="absolute right-0 z-50 mt-4 flex max-h-[350px] w-full min-w-max flex-col overflow-scroll rounded-md bg-default-black p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.2)] lg:left-0 lg:right-auto">
        <NetworkOptionList />
      </Popover.Panel>
    </Popover>
  );
};
