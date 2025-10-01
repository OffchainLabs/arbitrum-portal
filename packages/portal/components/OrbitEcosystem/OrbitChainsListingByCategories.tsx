'use client';

import Image from 'next/image';
import { usePostHog } from 'posthog-js/react';
import { useMemo, useState } from 'react';
import { twMerge } from 'tailwind-merge';

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

  return (
    <div className="flex flex-col gap-4">
      <div className="text-2xl">Browse by Category</div>
      <hr className="border-white/40" />

      <div className="relative h-full w-full">
        <div className="flex w-full flex-nowrap justify-around gap-3 overflow-hidden rounded-md">
          {ORBIT_CATEGORIES.map((category, index) => (
            <button
              className={twMerge(
                'group relative flex h-20 w-[20%] shrink grow skew-x-[-23deg] items-end justify-start overflow-hidden p-2 px-3 text-xs transition-all hover:w-[30%]',
                selectedCategory === category.slug ? 'bg-default-black' : 'bg-white/10',
                index === 0 && 'ml-[-20px]',
                index === ORBIT_CATEGORIES.length - 1 && 'mr-[-20px]',
              )}
              key={category.id}
              onClick={() => {
                handleCategoryClick(category.slug);
              }}
            >
              <div className="absolute left-0 top-0 z-10 h-full w-full bg-gradient-to-t from-black/60 from-[25%] to-transparent" />
              <Image
                src={`/images/orbit/${category.slug}.webp`}
                layout="fill"
                objectFit="contain"
                alt={category.slug}
                className={twMerge(
                  'skew-x-[23deg] scale-[2.3] opacity-30 grayscale group-hover:grayscale-0',
                  selectedCategory === category.slug && 'opacity-70 grayscale-0',
                )}
              />
              <div
                className={twMerge(
                  'z-20 skew-x-[23deg] px-2 text-base opacity-80 lg:text-lg',
                  index === 0 && 'ml-[20px]',
                  selectedCategory === category.slug && 'font-bold opacity-100',
                )}
              >
                <span className="hidden lg:block"> {category.title}</span>
                <span className="lg:hidden">{category.title.split(' ')[0]}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Orbit chains list */}

      <div className="mt-4 grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {orbitChainsToShow.map((orbitChain) => (
          <OrbitItemBox slug={orbitChain.slug} key={orbitChain.slug} />
        ))}
      </div>
    </div>
  );
};
