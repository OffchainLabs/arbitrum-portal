import { Popover } from '@headlessui/react';
import { usePostHog } from 'posthog-js/react';

import { CategoriesPanel } from './CategoriesPanel';
import { CategoryDropdownButton } from './CategoryDropdownButton';

export const CategoryDropdown = () => {
  const posthog = usePostHog();

  function sendCategoryButtonClickEvent() {
    posthog?.capture('Category Button Click');
  }

  return (
    <Popover className="relative w-full lg:w-max">
      <Popover.Button as="div" onClick={sendCategoryButtonClickEvent}>
        <CategoryDropdownButton />
      </Popover.Button>
      <Popover.Panel className="relative z-50 flex max-h-[80vh] w-max flex-col overflow-auto rounded-md bg-neutral-50 border border-neutral-200 lg:absolute lg:left-1/2 lg:-translate-x-[75px] lg:mt-4 lg:p-4 lg:shadow-[0px_4px_20px_rgba(0,0,0,0.2)]">
        <CategoriesPanel />
      </Popover.Panel>
    </Popover>
  );
};
