import { FullProject } from '@/common/types';
import { getChainDetailsById } from '@/common/chains';
import { sortBySubcategoryRank } from '@/common/subcategories';
import { CATEGORY_TO_SUBCATEGORIES } from '@/common/categories';
import { getSelectedChainsInfo } from './getSelectedChainsInfo';

export const filterByChains = (
  projects: FullProject[],
  selectedChains: string[],
) => {
  const { areAllChainsSelected } = getSelectedChainsInfo(selectedChains);

  if (areAllChainsSelected) return projects;

  const selectedChainTitles = selectedChains.map((chainSlug) => {
    const chainDetails = getChainDetailsById(chainSlug);
    if (!chainDetails) return '';
    return chainDetails.title;
  });

  return projects.filter((project) => {
    return selectedChainTitles.some(
      (title) => project.chainsMap[title] === true,
    );
  });
};

export const filterBySubcategories = (
  projects: FullProject[],
  selectedCategory: string,
  selectedSubcategories: string[],
) => {
  const allowedSubcategories = [
    ...(selectedSubcategories || []),
    ...(CATEGORY_TO_SUBCATEGORIES[selectedCategory] || []),
  ].sort(sortBySubcategoryRank);

  if (!allowedSubcategories.length) return projects;

  return projects.filter((project) =>
    project.subcategories.some((itemSubcategory) =>
      allowedSubcategories.includes(itemSubcategory.slug),
    ),
  );
};

export const filterByFeatured = (
  projects: FullProject[],
  isFeatured: boolean,
) => {
  if (!isFeatured) return projects; // If not filtering by featured, return all projects

  return projects.filter(
    (project) =>
      project.meta.isFeaturedOnHomePage ||
      project.meta.isFeaturedOnCategoryPage,
  );
};
