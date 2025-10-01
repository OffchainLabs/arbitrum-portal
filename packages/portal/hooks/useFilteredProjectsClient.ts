'use client';

import { useFilteredProjects } from './useFilteredProjects';
import { useSelectedCategory } from './useSelectedCategory';
import { useSelectedChains } from './useSelectedChains';
import { useSelectedSubcategories } from './useSelectedSubcategories';

/**
 * Client side version of useFilteredProject -
 * - we can use this to get project at the "Leaf" client nodes without the need to pass server props (prop drilling)
 */

export const useFilteredProjectsClient = () => {
  const { selectedCategory } = useSelectedCategory();
  const { selectedSubcategories } = useSelectedSubcategories();
  const { selectedChains } = useSelectedChains();
  return useFilteredProjects({
    selectedCategory,
    selectedSubcategories,
    selectedChains,
  });
};
