import { useMemo } from 'react';
import { FullProject } from '@/common/types';
import { PROJECTS } from '@/common/projects';
import { filterByChains, filterBySubcategories } from '@/common/projectFilters';

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
    () =>
      filterBySubcategories(
        filteredProjectsByChains,
        selectedCategory,
        selectedSubcategories,
      ),
    [filteredProjectsByChains, selectedCategory, selectedSubcategories],
  );

  return filteredItems;
}
