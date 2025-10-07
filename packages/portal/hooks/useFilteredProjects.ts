import { useMemo } from 'react';

import { filterByChains, filterBySubcategories } from '@/common/projectFilters';
import { PROJECTS } from '@/common/projects';
import { FullProject } from '@/common/types';

export type GetFilteredProjectsParams = {
  selectedCategory: string;
  selectedSubcategories: string[];
  selectedChains: string[];
};

export const getFilteredProjects = ({
  selectedCategory,
  selectedSubcategories,
  selectedChains,
}: GetFilteredProjectsParams): FullProject[] => {
  const filteredProjectsByChains = filterByChains(PROJECTS, selectedChains);

  return filterBySubcategories(filteredProjectsByChains, selectedCategory, selectedSubcategories);
};

export function useFilteredProjects({
  selectedCategory,
  selectedSubcategories,
  selectedChains,
}: GetFilteredProjectsParams) {
  const filteredItems: FullProject[] = useMemo(
    () =>
      getFilteredProjects({
        selectedCategory,
        selectedSubcategories,
        selectedChains,
      }),
    [selectedCategory, selectedSubcategories, selectedChains],
  );

  return filteredItems;
}
