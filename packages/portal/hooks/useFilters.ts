// hook which takes in the subcategories and outputs the best set of URL filters describing it
// takes care of all heavy-lifting of whether we should route to Category page / or subcategory or whatever..
// eg. [subcat1, subcat2], subcat3 => cat1, subcat3

import { useMemo } from 'react';
import queryString from 'query-string';
import { useRouter } from 'next/navigation';
import {
  getSubcategoryDetailsById,
  sortBySubcategoryRank,
} from '@/common/subcategories';
import { useSelectedChains } from './useSelectedChains';
import {
  CATEGORY_TO_SUBCATEGORIES,
  getCategoryBySubcategoryList,
} from '@/common/categories';
import { useSelectedCategory } from './useSelectedCategory';
import { useSelectedSubcategories } from './useSelectedSubcategories';

// given a list of subcategories,
// create a mapping of [category-id] -> {subcategoryFromList : true}
const createFiltersMap = (subcategoryList: string[]) => {
  const filtersMap: {
    [categoryId: string]: { [subcategoryId: string]: boolean };
  } = {};

  // Identify category from subcategory and set it in filters' map
  subcategoryList.forEach((subcatId) => {
    const subcategory = getSubcategoryDetailsById(subcatId);
    if (subcategory) {
      const categoryId = subcategory.categoryId;
      if (categoryId) {
        if (!filtersMap[categoryId]) {
          filtersMap[categoryId] = { [subcatId]: true };
        } else {
          filtersMap[categoryId][subcatId] = true;
        }
      }
    }
  });
  return filtersMap;
};

export const useFilters = () => {
  const router = useRouter();
  const { selectedChains } = useSelectedChains();

  // get the final list of subcategories to filter projects from (derived from selected categories and other selected categories)
  const { selectedCategory } = useSelectedCategory();
  const { selectedSubcategories } = useSelectedSubcategories();
  const allowedSubcategories = useMemo(
    () =>
      [
        ...(selectedSubcategories || []),
        ...(CATEGORY_TO_SUBCATEGORIES[selectedCategory] || []),
      ].sort(sortBySubcategoryRank),

    [selectedCategory, selectedSubcategories],
  );

  // given a list of subcategories, route to the best matching URL for that
  const setFiltersInUrl = (subcategoryList: string[]) => {
    // 0. If no subcategory is selected
    if (!subcategoryList.length) {
      // if no filters, show all projects
      router.replace(
        `/projects?${queryString.stringify({
          chains: selectedChains.join('_'), // in case applied, keep chain filters persistent
        })}`,
      );
      return;
    }

    // 1. Create mapping of [category-id] -> {subcategoryFromList : true} from the input list
    const filtersMap = createFiltersMap(subcategoryList);

    // 2. check if only 1 category is identified?
    const isOnlyOneCategorySelected = Object.keys(filtersMap).length === 1;

    // 3. If multiple categories selected, simply filter by subcategories and exit
    if (!isOnlyOneCategorySelected) {
      const finalSubcategoryList = Object.values(filtersMap)
        .flatMap(Object.keys)
        .sort(sortBySubcategoryRank);

      router.replace(
        `/projects?${queryString.stringify({
          chains: selectedChains.join('_'),
          subcategories: finalSubcategoryList.join('_'),
        })}`,
      );
      return;
    }

    // 4. Else, One category is selected - fully or partially.
    // From the One category selected, check if the selected subcategories contain ALL the possible subcategories
    const finalSubcategoryList = Object.keys(
      filtersMap[Object.keys(filtersMap)[0]],
    ).sort(sortBySubcategoryRank);

    const isOneCategoryCompletelySelected =
      getCategoryBySubcategoryList(finalSubcategoryList);

    // One category is selected completely, route to it's dedicated category page
    if (isOneCategoryCompletelySelected) {
      router.replace(
        `/projects/${isOneCategoryCompletelySelected}?${queryString.stringify({
          chains: selectedChains.join('_'), // in case applied, keep chain filters persistent
        })}`,
      );
      return;
    }

    // Else, One category is selected partially, simply filter by subcategories
    router.replace(
      `/projects?${queryString.stringify({
        chains: selectedChains.join('_'),
        subcategories: finalSubcategoryList.join('_'),
      })}`,
    );
  };

  return { setFiltersInUrl, allowedSubcategories };
};
