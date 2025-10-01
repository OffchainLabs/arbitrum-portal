'use client';

import { useMemo, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { CATEGORIES } from '@/common/categories';
import { getSpotlightProjects } from '@/common/projects';
import { Card } from '@/components/Card';
import { ProjectItemBox } from '@/components/ProjectItemBox';
import { ResponsiveHorizontalScrollableLayout } from '@/components/ResponsiveHorizontalScrollableLayout';

export const EcosystemEssentials = () => {
  const [selectedCategory, setSelectedCategory] = useState('defi');

  const spotlightProjects = useMemo(
    () => getSpotlightProjects(selectedCategory).slice(0, 3),
    [selectedCategory],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="text-2xl">Ecosystem Essentials</div>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => (
          <button
            className={twMerge(
              'shrink-0 rounded-md bg-default-black p-2 px-3 text-xs',
              selectedCategory === category.slug
                ? 'bg-white text-default-black'
                : 'hover:bg-default-black-hover',
            )}
            key={category.id}
            onClick={() => {
              setSelectedCategory(category.slug);
            }}
          >
            {category.title}
          </button>
        ))}
      </div>
      <hr className="border-white/40" />

      <div className="flex flex-nowrap gap-3">
        {spotlightProjects.length ? (
          <ResponsiveHorizontalScrollableLayout>
            {spotlightProjects.map((slug) => (
              <ProjectItemBox
                slug={slug}
                key={slug}
                analyticsSource={'Homepage Ecosystem Essentials'}
                displayMode="spotlight"
                className="max-w-[300px] lg:max-w-none"
              />
            ))}
          </ResponsiveHorizontalScrollableLayout>
        ) : (
          <Card className="h-[200px] w-full">No projects to show</Card>
        )}
      </div>
    </div>
  );
};
