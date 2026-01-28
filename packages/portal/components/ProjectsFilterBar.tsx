'use client';

import { ArrowSmallLeftIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { SUBMIT_ORBIT_CHAIN_LINK, SUBMIT_PROJECT_LINK } from '@/common/constants';

import { CategoriesPanel } from './CategoriesPanel';
import { CategoryDropdown } from './CategoryDropdown';
import { CategoryDropdownButton } from './CategoryDropdownButton';
import { ExternalLink } from './ExternalLink';
import { NetworkDropdown } from './NetworkDropdown';
import { SidePanel } from './SidePanel';
import { SortDropdown } from './SortDropdown';

export const ProjectsFilterBar = () => {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isOrbitPage = pathname.includes('orbit');

  const openPanel = () => {
    setIsSidePanelOpen(true);
  };

  const closePanel = () => {
    setIsSidePanelOpen(false);
  };

  const resetFilters = () => {
    router.replace('/projects');
  };

  useEffect(() => {
    const resizeHandler = () => {
      if (window.innerWidth >= 1024) {
        closePanel();
      }
    };
    window.addEventListener('resize', resizeHandler);
    return () => {
      window.removeEventListener('resize', resizeHandler);
    };
  }, []);

  return (
    <nav className="z-100 w-full py-2">
      <div className="flex w-full items-center justify-between">
        {/* Left side: Filter buttons */}
        <ul className="flex w-full items-center gap-4 text-center lg:w-auto lg:flex-row">
          <li className="hidden lg:block">
            <CategoryDropdown />
          </li>
          <li className="w-full lg:hidden">
            <CategoryDropdownButton onClick={openPanel} />
          </li>
          <li className="w-full lg:block">
            <NetworkDropdown />
          </li>
          <li className="w-full lg:block">
            <SortDropdown />
          </li>
        </ul>
        {/* Right side: Add your project button */}
        <div className="flex items-center">
          <ExternalLink
            href={isOrbitPage ? SUBMIT_ORBIT_CHAIN_LINK : SUBMIT_PROJECT_LINK}
            className={twMerge(
              'group flex shrink-0 grow-0 select-none flex-nowrap items-center justify-start gap-2 rounded-md p-2 text-sm no-underline hover:bg-default-black-hover md:flex',
            )}
          >
            <PlusCircleIcon className="h-4 w-4" />
            {isOrbitPage ? 'Add your Orbit Chain' : 'Add your project'}
          </ExternalLink>
        </div>
      </div>

      <SidePanel isOpen={isSidePanelOpen} onClose={closePanel} className="w-full bg-default-black">
        <div className="flex items-center justify-between px-4 py-8 text-white">
          <button
            onClick={closePanel}
            className="flex items-center justify-center gap-1 text-sm font-medium leading-7 hover:opacity-70"
          >
            <ArrowSmallLeftIcon className="h-4 w-4 stroke-2" />
            <span>Done</span>
          </button>
          <button className="text-sm font-medium leading-7 hover:opacity-70" onClick={resetFilters}>
            Clear all
          </button>
        </div>
        <div>
          <CategoriesPanel />
        </div>
      </SidePanel>
    </nav>
  );
};
