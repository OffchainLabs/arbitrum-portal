'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { CategorySelector, CategorySelectorOption } from '@/app-components/CategorySelector';
import { CATEGORIES } from '@/common/categories';
import { useSelectedCategory } from '@/hooks/useSelectedCategory';

export const ProjectsCategorySelector = () => {
  const router = useRouter();
  const { selectedCategory } = useSelectedCategory();

  const categoryConfig: CategorySelectorOption[] = useMemo(() => {
    const allOption: CategorySelectorOption = {
      id: 'all',
      label: 'All',
      imageUrl: '/images/orbit/all.webp',
      onClick: () => {
        router.push('/projects');
      },
    };

    const categoryOptions: CategorySelectorOption[] = CATEGORIES.map((category) => ({
      id: category.slug,
      label: category.slug === 'bridges-and-on-ramps' ? 'Bridges' : category.title,
      imageUrl: `/images/orbit/${category.slug}.webp`,
      onClick: () => {
        router.push(`/projects/${category.slug}`);
      },
    }));

    return [allOption, ...categoryOptions];
  }, [router]);

  return (
    <div className="hidden md:block">
      <CategorySelector config={categoryConfig} selectedId={selectedCategory} />
    </div>
  );
};
