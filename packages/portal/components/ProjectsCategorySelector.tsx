'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useWindowSize } from 'react-use';

import { CategorySelector, CategorySelectorOption } from '@/app-components/CategorySelector';
import { CATEGORIES } from '@/common/categories';
import { useSelectedCategory } from '@/hooks/useSelectedCategory';

export const ProjectsCategorySelector = () => {
  const router = useRouter();
  const { selectedCategory } = useSelectedCategory();
  const { width } = useWindowSize();
  const isSmallScreen = width < 768;

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
      label: category.title,
      imageUrl: `/images/orbit/${category.slug}.webp`,
      onClick: () => {
        router.push(`/projects/${category.slug}`);
      },
    }));

    return [allOption, ...categoryOptions].filter((option) => option.id !== 'bridges-and-on-ramps');
  }, [router]);

  return isSmallScreen ? null : (
    <CategorySelector config={categoryConfig} selectedId={selectedCategory} />
  );
};
