import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { usePostHog } from 'posthog-js/react';
import { Dispatch, SetStateAction, useMemo } from 'react';

import { Category } from '@/common/types';
import { useArbQueryParams } from '@/hooks/useArbQueryParams';

export const CategoryHeaderRow = ({
  category,
  isEverySubcategorySelected,
  isExpanded,
  setIsExpanded,
  resetFilters,
}: {
  category: Category;
  isEverySubcategorySelected: boolean;
  isExpanded: boolean;
  setIsExpanded: Dispatch<SetStateAction<boolean>>;
  resetFilters: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) => {
  const [{ categories = [] }] = useArbQueryParams();
  const posthog = usePostHog();

  const subcategories = category.subcategories.map((subcategory) => subcategory.slug);

  const toggleExpansion = () => {
    posthog?.capture('Category Click', {
      category: category.title,
      action: isExpanded ? 'Collapse' : 'Expand',
    });
    setIsExpanded(!isExpanded);
  };

  const selectedSubcategoriesCount = useMemo(
    () => categories.filter((urlCat) => subcategories.includes(urlCat!)).length,

    [categories, subcategories],
  );

  const showResetButton = isEverySubcategorySelected
    ? !isExpanded
    : selectedSubcategoriesCount !== 0;

  return (
    <div
      className="flex w-full cursor-pointer items-center justify-between lg:pointer-events-none"
      onClick={toggleExpansion}
    >
      <span className="font-medium leading-6">{category.title}</span>
      <div className="flex items-center justify-center gap-1">
        {showResetButton && (
          <button
            className="flex items-center justify-center gap-1 rounded-full bg-white px-2 py-1 text-xs text-black hover:bg-black hover:text-white [&>svg]:hover:stroke-cyan"
            onClick={resetFilters}
          >
            {isEverySubcategorySelected ? 'All' : selectedSubcategoriesCount}
            <XMarkIcon className="h-4 w-4 stroke-black stroke-2" />
          </button>
        )}
        <button className="flex items-center justify-center p-1 lg:hidden">
          <ChevronDownIcon
            className={`h-4 w-4 stroke-white stroke-2 duration-300 ease-in-out ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>
    </div>
  );
};
