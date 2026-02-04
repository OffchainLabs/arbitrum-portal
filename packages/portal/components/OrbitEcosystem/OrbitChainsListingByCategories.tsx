'use client';

import { usePostHog } from 'posthog-js/react';
import { useMemo, useState } from 'react';

import { CategorySelector, CategorySelectorOption } from '@/app-components/CategorySelector';
import { CATEGORIES } from '@/common/categories';
import { ORBIT_CHAINS, orbitChainsGroupedByCategorySlug } from '@/common/orbitChains';
import { OrbitItemBox } from '@/components/OrbitItemBox';

const ORBIT_CATEGORIES = [{ id: 'all', slug: 'all', title: 'All' }, ...CATEGORIES].filter(
  (cat) => cat.slug !== 'bridges-and-on-ramps',
);

type CategoryKeys = (typeof ORBIT_CATEGORIES)[number]['slug'];

export const OrbitChainsListingByCategories = () => {
  const posthog = usePostHog();
  const [selectedCategory, setSelectedCategory] = useState<CategoryKeys>('all');

  const handleCategoryClick = (slug: CategoryKeys) => {
    const scrollPosition = window.scrollY; // Capture current scroll position

    setSelectedCategory(slug);

    // Restore scroll position after state update
    setTimeout(() => {
      window.scrollTo(0, scrollPosition);
    }, 0);

    posthog?.capture('Orbit Category Filter Change', {
      category: slug,
    });
  };

  const orbitChainsToShow = useMemo(() => {
    if (selectedCategory === 'all') return ORBIT_CHAINS;

    return orbitChainsGroupedByCategorySlug[selectedCategory] ?? [];
  }, [selectedCategory]);

  const categoryConfig: CategorySelectorOption[] = ORBIT_CATEGORIES.map((category) => ({
    id: category.slug,
    label: category.title,
    imageUrl: `/images/orbit/${category.slug}.webp`,
    onClick: () => handleCategoryClick(category.slug),
  }));

  return (
    <div className="flex flex-col gap-4">
      <CategorySelector
        config={categoryConfig}
        selectedId={selectedCategory}
        title="Browse by Category"
      />

      {/* Orbit chains list */}

      <div className="mt-4 grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {orbitChainsToShow.map((orbitChain) => (
          <OrbitItemBox slug={orbitChain.slug} key={orbitChain.slug} />
        ))}
      </div>
    </div>
  );
};
