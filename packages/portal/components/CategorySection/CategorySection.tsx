import { useMemo, useState } from 'react';
import { usePostHog } from 'posthog-js/react';

import { CategoryHeaderRow } from '../CategoryHeaderRow';
import { SelectedSubcategories } from './SelectedSubcategories';
import { SubcategoriesList } from './SubcategoriesList';
import { SelectAllButton, UnselectAllButton } from './SelectButtons';
import { useSelectedCategory } from '@/hooks/useSelectedCategory';
import { useSelectedSubcategories } from '@/hooks/useSelectedSubcategories';
import { useFilters } from '@/hooks/useFilters';
import { Category, Subcategory } from '@/common/types';
import { CATEGORY_TO_SUBCATEGORIES } from '@/common/categories';

const isValidUrlCategory = (cat: string) =>
  !!(cat.length && CATEGORY_TO_SUBCATEGORIES[cat]?.length > 0);

export const CategorySection = ({ category }: { category: Category }) => {
  const { selectedCategory: urlCategory } = useSelectedCategory();
  const { selectedSubcategories: urlSubcategories } =
    useSelectedSubcategories();
  const [isExpanded, setIsExpanded] = useState(true);
  const posthog = usePostHog();
  const { setFiltersInUrl } = useFilters();

  const subcategoriesInThisCategory = CATEGORY_TO_SUBCATEGORIES[category.slug];

  const selectedSubcategories = useMemo(
    () =>
      isValidUrlCategory(urlCategory)
        ? [...urlSubcategories, ...CATEGORY_TO_SUBCATEGORIES[urlCategory]]
        : urlSubcategories,
    [urlSubcategories, urlCategory],
  );

  const isEverySubcategorySelected =
    urlCategory === category.slug ||
    subcategoriesInThisCategory.every((subcategory) =>
      selectedSubcategories.includes(subcategory),
    );

  const selectedSubcategoriesWithinCategory: Subcategory[] =
    isEverySubcategorySelected
      ? category.subcategories
      : subcategoriesInThisCategory.reduce(
          (subcategoryObjectList, subcategorySlug) => {
            // find selected subcategories from the url query param list
            if (selectedSubcategories.includes(subcategorySlug)) {
              // using the slug, find the Subcategory object in the category's Subcategory[]
              let selectedSubcategoryObject = category.subcategories.find(
                (subcategory) => subcategory.slug === subcategorySlug,
              );
              // now push the `Subcategory` object found for the slug to the list
              if (selectedSubcategoryObject) {
                subcategoryObjectList.push(selectedSubcategoryObject);
              }
            }
            return subcategoryObjectList;
          },
          [] as Subcategory[],
        );

  function selectAll() {
    posthog?.capture('Category Select All Button Click', {
      category: category.title,
    });

    const resultingSubcategories = [
      ...(urlSubcategories || []), // already present subcategories in URL,
      ...(CATEGORY_TO_SUBCATEGORIES[urlCategory] || []), // if complete parent category selected, it's subcategories
      ...CATEGORY_TO_SUBCATEGORIES[category.slug], // plus the current one
    ];

    setFiltersInUrl(resultingSubcategories);
  }

  const resetFilters = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    posthog?.capture('Category Unselect All Button Click', {
      category: category.title,
    });

    const resultingSubcategories = [
      ...(urlSubcategories || []), // already present subcategories in URL,
      ...(CATEGORY_TO_SUBCATEGORIES[urlCategory] || []), // if complete parent category selected, it's subcategories
      ...CATEGORY_TO_SUBCATEGORIES[category.slug], // plus the current one
    ].filter((selectedSubcategory) => {
      return (
        !subcategoriesInThisCategory.includes(selectedSubcategory) &&
        urlCategory !== category.slug.toLowerCase()
      );
    });

    setFiltersInUrl(resultingSubcategories);
  };

  return (
    <div key={category.slug} className="py-4">
      <CategoryHeaderRow
        category={category}
        isEverySubcategorySelected={isEverySubcategorySelected}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        resetFilters={resetFilters}
      />
      <div>
        {isExpanded ? (
          <>
            {!isEverySubcategorySelected && (
              <SelectAllButton onClick={selectAll} />
            )}
            {isEverySubcategorySelected && (
              <UnselectAllButton onClick={resetFilters} />
            )}
            <SubcategoriesList category={category} />
          </>
        ) : (
          <SelectedSubcategories
            selectedSubcategoriesWithinCategory={
              selectedSubcategoriesWithinCategory
            }
          />
        )}
      </div>
    </div>
  );
};
