'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { Card } from './Card';
import { useSearch } from '@/hooks/useSearch';
import { FuzzySearchResult, SearchResult } from '@/common/getSearchResults';
import { getCategoryDetailsById } from '@/common/categories';
import { getProjectDetailsById } from '@/common/projects';
import { getSubcategoryDetailsById } from '@/common/subcategories';
import { EntityType, FullProject, OrbitChain } from '@/common/types';
import { getOrbitChainDetailsById } from '@/common/orbitChains';
import { SearchedOrbitChains } from './SearchedOrbitChains';
import { SearchedProjects } from './SearchedProjects';

type GroupedResults = Record<EntityType, SearchResult[]>;
const getFullPageGroupedResults = (searchResults: FuzzySearchResult[]) => {
  return searchResults.reduce(
    (groupedResult: GroupedResults, searchResult) => {
      const item = searchResult.item;
      if (!groupedResult[item.entityType]) groupedResult[item.entityType] = [];
      groupedResult[item.entityType].push(item);
      return groupedResult;
    },

    // initialize with empty object
    {
      [EntityType.Project]: [],
      [EntityType.Category]: [],
      [EntityType.Subcategory]: [],
      [EntityType.OrbitChain]: [],
    },
  );
};

export const FullPageSearchResults = ({
  searchString,
  searchResults,
}: {
  searchString: string;
  searchResults: FuzzySearchResult[];
}) => {
  const { handleSearchResultSelection } = useSearch();

  if (!searchResults.length) {
    return (
      <Card>
        No results found for <q>{searchString}</q>
      </Card>
    );
  }

  const fullPageResult = getFullPageGroupedResults(searchResults);

  const projects =
    fullPageResult[EntityType.Project].reduce(
      (result: FullProject[], project) => {
        const projectDetails = getProjectDetailsById(project.slug);
        if (projectDetails) {
          result.push(projectDetails);
        }
        return result;
      },
      [],
    ) || [];

  const orbitChains =
    fullPageResult[EntityType.OrbitChain].reduce(
      (result: OrbitChain[], orbitChain) => {
        const orbitChainDetails = getOrbitChainDetailsById(orbitChain.slug);

        if (orbitChainDetails) {
          result.push(orbitChainDetails);
        }
        return result;
      },
      [],
    ) || [];

  const categories =
    fullPageResult[EntityType.Category].map((category) => ({
      ...category,
      ...getCategoryDetailsById(category.slug),
    })) || [];

  const subcategories =
    fullPageResult[EntityType.Subcategory].map((subcategory) => ({
      ...subcategory,
      ...getSubcategoryDetailsById(subcategory.slug),
    })) || [];

  const projectsCount = projects.length;
  const categoriesCount = categories.length;
  const subcategoriesCount = subcategories.length;
  const orbitChainsCount = orbitChains.length;
  const totalResultCount =
    projectsCount + categoriesCount + subcategoriesCount + orbitChainsCount;

  const showOrbitChainsBeforeProjects =
    searchResults[0]!.item.entityType === EntityType.OrbitChain;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        Showing {totalResultCount} result{totalResultCount !== 1 && 's'}
      </div>

      <div className="flex flex-col gap-12">
        {showOrbitChainsBeforeProjects ? (
          <>
            <SearchedOrbitChains orbitChains={orbitChains} />
            <SearchedProjects projects={projects} />
          </>
        ) : (
          <>
            <SearchedProjects projects={projects} />
            <SearchedOrbitChains orbitChains={orbitChains} />
          </>
        )}

        {/* Categories + Subcategories */}
        {categoriesCount > 0 || subcategoriesCount > 0 ? (
          <div>
            <div className="mb-4 flex items-center gap-2 text-xl">
              <div>
                {categoriesCount + subcategoriesCount > 1
                  ? 'Categories'
                  : 'Category'}
              </div>
              <span className="flex min-h-6 min-w-6 items-center justify-center rounded-full bg-white/20 p-1 px-3 text-center text-xs text-white/50">
                {categoriesCount + subcategoriesCount}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {[...categories, ...subcategories].map((filter) => (
                <Card
                  key={filter.slug}
                  onClick={() => handleSearchResultSelection(filter)}
                  className="col-span-1 flex w-full cursor-pointer items-center justify-between gap-4 p-4 hover:bg-default-black-hover"
                >
                  <div className="flex items-center gap-3">
                    {/* Image */}
                    <MagnifyingGlassIcon className="h-6 w-6 shrink-0 p-1" />

                    {/* Title and description */}
                    <div className="flex flex-col items-start text-left">
                      <div className="font-light">{filter.title}</div>
                      {filter.searchTitle && (
                        <div className="text-xs font-light opacity-50">
                          {filter.searchTitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Type Tag */}
                  {filter.entityType === EntityType.Project ? (
                    <div className="rounded-md bg-white/10 px-2 text-xs font-light capitalize">
                      {filter.entityType}
                    </div>
                  ) : null}
                </Card>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
};
