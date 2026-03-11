'use client';

import { useMemo, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { CATEGORIES } from '@/common/categories';
import { spotlightOrbitChains } from '@/common/orbitChains';
import { getSpotlightProjects } from '@/common/projects';
import { Card } from '@/components/Card';
import { OrbitItemBox } from '@/components/OrbitItemBox';
import { ProjectItemBox } from '@/components/ProjectItemBox';
import { ResponsiveHorizontalScrollableLayout } from '@/components/ResponsiveHorizontalScrollableLayout';

export const EcosystemEssentials = () => {
  const CHAIN_SPOTLIGHT_KEY = 'chain-spotlight';

  const [selectedCategory, setSelectedCategory] = useState('defi');

  const isChainSpotlight = selectedCategory === CHAIN_SPOTLIGHT_KEY;

  const spotlightProjects = useMemo(
    () => (isChainSpotlight ? [] : getSpotlightProjects(selectedCategory).slice(0, 3)),
    [selectedCategory, isChainSpotlight],
  );

  const spotlightChains = useMemo(
    () => (isChainSpotlight ? spotlightOrbitChains.slice(0, 3) : []),
    [isChainSpotlight],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="text-2xl">Ecosystem Essentials</div>
      <div className="flex flex-wrap gap-2">
        <button
          className={twMerge(
            'shrink-0 rounded-md bg-default-black p-2 px-3 text-xs',
            selectedCategory === CHAIN_SPOTLIGHT_KEY
              ? 'bg-white text-default-black'
              : 'hover:bg-default-black-hover',
          )}
          onClick={() => {
            setSelectedCategory(CHAIN_SPOTLIGHT_KEY);
          }}
        >
          Chains
        </button>
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
        {isChainSpotlight ? (
          spotlightChains.length ? (
            <ResponsiveHorizontalScrollableLayout>
              {spotlightChains.map((slug) => (
                <OrbitItemBox
                  slug={slug}
                  key={slug}
                  analyticsSource={'Homepage Ecosystem Essentials'}
                  displayMode="spotlight"
                  className="max-w-[300px] lg:max-w-none w-full max-h-[200px]"
                  showProjectPreview={false}
                />
              ))}
            </ResponsiveHorizontalScrollableLayout>
          ) : (
            <Card className="h-[200px] w-full">No chains to show</Card>
          )
        ) : spotlightProjects.length ? (
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
