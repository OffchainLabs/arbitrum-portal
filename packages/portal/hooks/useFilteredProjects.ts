import { useMemo } from 'react';

import { filterByChains, filterBySubcategories } from '@/common/projectFilters';
import { PROJECTS } from '@/common/projects';
import { FullProject } from '@/common/types';

type Props = {
  selectedCategory: string;
  selectedSubcategories: string[];
  selectedChains: string[];
};

export function useFilteredProjects({
  selectedCategory,
  selectedSubcategories,
  selectedChains,
}: Props) {
  const filteredProjectsByChains = useMemo(
    () => filterByChains(PROJECTS, selectedChains),
    [selectedChains],
  );

  const filteredItems: FullProject[] = useMemo(
    () => filterBySubcategories(filteredProjectsByChains, selectedCategory, selectedSubcategories),
    [filteredProjectsByChains, selectedCategory, selectedSubcategories],
  );

  return filteredItems;
}
