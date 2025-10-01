'use client';

import { CheckIcon } from '@heroicons/react/24/outline';
import { usePostHog } from 'posthog-js/react';
import { useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

import { CATEGORY_TO_SUBCATEGORIES } from '@/common/categories';
import { getChainDetailsById } from '@/common/chains';
import { getSelectedChainsInfo } from '@/common/getSelectedChainsInfo';
import { AppCountChain, Category, Subcategory } from '@/common/types';
import { useFilters } from '@/hooks/useFilters';
import { useSelectedCategory } from '@/hooks/useSelectedCategory';
import { useSelectedChains } from '@/hooks/useSelectedChains';
import { useSelectedSubcategories } from '@/hooks/useSelectedSubcategories';

export const FilterTag = ({
  category,
  subcategory,
}: {
  category: Category;
  subcategory: Subcategory;
}) => {
  const { selectedCategory } = useSelectedCategory();
  const { selectedSubcategories: urlSubcategories } = useSelectedSubcategories();
  const { selectedChains } = useSelectedChains();
  const { areAllChainsSelected } = getSelectedChainsInfo(selectedChains);
  const posthog = usePostHog();

  const { setFiltersInUrl } = useFilters();
  const subcategoryTitle = useMemo(() => {
    if (subcategory.title.toLowerCase().includes('(other)')) {
      return 'Other';
    }
    return subcategory.title;
  }, [subcategory]);

  const appCount = useMemo(() => {
    if (areAllChainsSelected) {
      // all chains selected
      return subcategory.appCount.Total;
    }

    return selectedChains
      .map((chainId) => {
        const chainDetails = getChainDetailsById(chainId);
        if (!chainDetails) return undefined;
        return chainDetails.title;
      })
      .reduce((total: number, chainKey: AppCountChain | undefined) => {
        if (!chainKey) return total;
        return total + (subcategory.appCount[chainKey] || 0);
      }, 0);
  }, [selectedChains, subcategory, areAllChainsSelected]);

  const isIndividuallySelected = urlSubcategories.includes(subcategory.slug);
  const isParentCategorySelected = selectedCategory === category.slug.toLowerCase();

  const isSelected = isIndividuallySelected || isParentCategorySelected;

  const onClick = () => {
    posthog?.capture('Subcategory Click', {
      subcategory: subcategory.title,
      action: isSelected ? 'Unselect' : 'Select',
    });

    const isBeingSelected = !isSelected; // just easier to read

    let resultingSubcategories = [
      ...(urlSubcategories || []), // already present subcategories in URL,
      ...(CATEGORY_TO_SUBCATEGORIES[selectedCategory] || []), // if complete parent category selected, it's subcategories
    ];

    if (isBeingSelected) {
      // checkbox being selected
      resultingSubcategories = [...resultingSubcategories, subcategory.slug]; // plus the current one
    } else {
      // checkbox being un-selected
      resultingSubcategories = resultingSubcategories.filter(
        (subcat) => subcat !== subcategory.slug, // minus the current one
      );
    }

    setFiltersInUrl(resultingSubcategories);
  };

  return (
    <div
      key={subcategory.slug}
      className={twMerge(
        'select-none justify-center px-1',
        appCount === 0 && 'pointer-events-none opacity-30',
      )}
    >
      <input
        type="checkbox"
        id={subcategory.slug}
        name={subcategory.title}
        checked={isSelected}
        onChange={onClick}
        className="peer [&:checked~label_.checkIcon]:visible [&:checked~label_span:first-child]:border-white [&:checked~label_span:first-child]:bg-white"
        hidden
        aria-hidden={false}
      />
      <label
        htmlFor={subcategory.slug}
        className="group flex cursor-pointer items-center gap-2 rounded-md p-1 px-3 text-left font-light text-white/50 hover:bg-white hover:text-black peer-checked:text-white hover:peer-checked:text-black"
      >
        <span className="flex items-center justify-center rounded-sm border border-gray-100/20 bg-default-black p-[3px] lg:p-[1px]">
          <CheckIcon className="checkIcon invisible h-4 w-4 stroke-black stroke-[3px] lg:h-3 lg:w-3" />
        </span>
        <span className="text-sm">
          {subcategoryTitle} ({appCount})
        </span>
      </label>
    </div>
  );
};
