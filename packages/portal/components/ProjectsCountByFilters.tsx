'use client';

import { MinusIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

import { CATEGORIES } from '@/common/categories';
import { useFilteredProjectsClient } from '@/hooks/useFilteredProjectsClient';
import { useFilters } from '@/hooks/useFilters';

const slugTitleMap = CATEGORIES.reduce(
  (slugTitleMap, category) => {
    // Add the category slug and title
    slugTitleMap[category.slug] = category.title;

    // Add all the subcategory slugs and titles
    const subcategorySlugsTitles: { [slug: string]: string } = category.subcategories.reduce(
      (subcategoryMap, subcategory) => {
        subcategoryMap[subcategory.slug] = subcategory.title;
        return subcategoryMap;
      },
      {} as { [slug: string]: string },
    );

    return { ...slugTitleMap, ...subcategorySlugsTitles };
  },
  {} as { [slug: string]: string },
);

function slugsToCategoryOrSubcategoryTitle(slug: string) {
  if (!slugTitleMap[slug]) {
    return null;
  }
  return slugTitleMap[slug];
}

const Tag = ({
  categoryOrSubcategory,
  onClick,
}: {
  categoryOrSubcategory: string | null;
  onClick: () => void;
}) => {
  if (!categoryOrSubcategory) {
    return null;
  }
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-md border border-white/5 bg-atmosphere-blue/50 px-2 py-1 text-xs text-white/80 hover:opacity-80"
    >
      {slugsToCategoryOrSubcategoryTitle(categoryOrSubcategory)}
      <XMarkIcon className="h-4 w-4" />
    </button>
  );
};

const MAX_LIMIT = 3;

export const ProjectsCountByFilters = () => {
  const projects = useFilteredProjectsClient();
  const [showingMore, setShowingMore] = useState(false);
  const { setFiltersInUrl, allowedSubcategories } = useFilters();

  const handleFilterClick = (categoryOrSubcategory: string) => {
    const resultingSubcategories = allowedSubcategories.filter(
      (category) => category !== categoryOrSubcategory,
    );
    setFiltersInUrl(resultingSubcategories);
  };

  if (allowedSubcategories.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
      {projects.length} project{projects.length !== 1 && 's'}
      {allowedSubcategories.length > 0 && ' filtered by'}{' '}
      {allowedSubcategories
        .slice(0, showingMore ? allowedSubcategories.length : MAX_LIMIT)
        .map((categoryOrSubcategory) => (
          <Tag
            key={categoryOrSubcategory}
            categoryOrSubcategory={categoryOrSubcategory}
            onClick={() => handleFilterClick(categoryOrSubcategory)}
          />
        ))}
      {/* Show more / show less button */}
      {allowedSubcategories.length - MAX_LIMIT > 1 ? (
        <button
          className="flex items-center gap-1 rounded-md border border-white/5 bg-default-black px-2 py-1 text-xs text-white/80 hover:opacity-80"
          onClick={() => setShowingMore(!showingMore)}
        >
          {showingMore ? (
            <>
              <MinusIcon className="h-3 w-3" /> Show less
            </>
          ) : (
            <>
              <PlusIcon className="h-3 w-3" />
              {`${allowedSubcategories.length - MAX_LIMIT} Others`}
            </>
          )}
        </button>
      ) : null}
    </div>
  );
};
