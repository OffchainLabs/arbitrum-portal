'use client';

import { ArrowSmallLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { CategoriesPanel } from './CategoriesPanel';
import { CategoryDropdown } from './CategoryDropdown';
import { CategoryDropdownButton } from './CategoryDropdownButton';
import { NetworkDropdown } from './NetworkDropdown';
import { SidePanel } from './SidePanel';
import { SortDropdown } from './SortDropdown';

export const ProjectsFilterBar = () => {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const router = useRouter();

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
    <nav className="z-100 w-full py-2 xl:sticky xl:top-[15px] xl:z-[100] xl:ml-[418px] xl:mt-[-72px] xl:w-[450px]">
      <div className="flex w-full items-center justify-between">
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
