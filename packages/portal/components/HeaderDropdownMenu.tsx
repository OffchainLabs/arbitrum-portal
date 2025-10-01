'use client';

import { Popover } from '@headlessui/react';
import {
  BookmarkIcon,
  ChevronDownIcon,
  PlusCircleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

import { SUBMIT_ORBIT_CHAIN_LINK, SUBMIT_PROJECT_LINK } from '@/common/constants';

import { ExternalLink } from './ExternalLink';

export const HeaderDropdownMenu = () => {
  const pathname = usePathname();
  const isMissionsPage: boolean = pathname.includes('missions');
  const isOrbitPage: boolean = pathname.includes('orbit');

  //   hide the dropdown button on missions page
  if (isMissionsPage) return null;

  const menuItemClassName =
    'group flex shrink-0 grow-0 select-none flex-nowrap items-center justify-start gap-2 rounded-md p-2 text-sm no-underline hover:bg-default-black-hover md:flex';

  return (
    <Popover className="relative">
      <Popover.Button className="group flex h-[40px] w-full max-w-[70px] shrink-0 grow-0 items-center justify-between gap-[5px] rounded-md border border-dark-gray bg-black px-[10px] py-[5px] text-sm text-white hover:bg-default-black-hover lg:w-max lg:px-2">
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          <UserCircleIcon className="h-5 w-5" />
        </div>
        <span className="flex shrink-0 items-center justify-center p-1 lg:block">
          <ChevronDownIcon className=" h-3 w-3 stroke-white stroke-2 lg:h-4 lg:w-4" />
        </span>
      </Popover.Button>
      <Popover.Panel className="absolute right-0 z-50 mt-4 flex max-h-[350px] w-full min-w-max origin-top-right flex-col overflow-scroll rounded-md bg-default-black p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.2)]">
        {({ close }) => {
          return (
            <div className="flex flex-col gap-2 text-left">
              <div>
                <Link href="/bookmarks" className={menuItemClassName} onClick={() => close()}>
                  <BookmarkIcon className="h-4 w-4" />
                  My apps
                </Link>
              </div>

              <ExternalLink
                className={twMerge(menuItemClassName, 'hidden lg:flex')}
                href={isOrbitPage ? SUBMIT_ORBIT_CHAIN_LINK : SUBMIT_PROJECT_LINK}
                onClick={() => close()}
              >
                <PlusCircleIcon className="h-4 w-4" />
                {isOrbitPage ? 'Add your Orbit Chain' : 'Add your project'}
              </ExternalLink>
            </div>
          );
        }}
      </Popover.Panel>
    </Popover>
  );
};
