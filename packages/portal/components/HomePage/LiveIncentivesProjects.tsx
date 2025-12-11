'use client';

import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';
import Flickity, { FlickityOptions } from 'react-flickity-component';
import { useWindowSize } from 'react-use';
import { twMerge } from 'tailwind-merge';

import { projectsWithLiveIncentives } from '@/common/projects';

import { ProjectItemBox } from '../ProjectItemBox';

export function LiveIncentivesProjects() {
  const { width } = useWindowSize();
  const isDraggable = width <= 768;
  const [isReady, setIsReady] = useState(false);
  const flickityRef = useRef<Flickity | null>(null);

  const setupFlickityRef = useCallback(
    (carouselRef: Flickity | null) => {
      flickityRef.current = carouselRef;

      if (!flickityRef.current) return;

      flickityRef.current.on('ready', () => {
        if (isReady) return;
        setIsReady(true);
      });
    },
    [setIsReady, isReady],
  );

  const carouselOptions: FlickityOptions = {
    draggable: isDraggable,
    cellAlign: 'left',
    prevNextButtons: true,
    wrapAround: false,
    pageDots: false,
    groupCells: true,
    arrowShape:
      'M23.925 56.4284L57.45 90.9103L48.6125 100L-5.1656e-06 50L48.6125 5.0443e-06L57.45 9.08974L23.925 43.5716L100 43.5716L100 56.4284L23.925 56.4284Z',
    lazyLoad: true,
  };
  return (
    <div className="flex flex-col gap-4 max-h-[285px]">
      <div className="text-2xl flex items-center gap-2">
        <Image src="/icons/liveIncentives.svg" alt="Live Incentives" width={24} height={24} />
        <span>Live Incentives</span>
      </div>
      <div className="-mt-4 text-sm opacity-70">Choose your opportunity and claim your rewards</div>
      <hr className="border-white/40" />

      <Flickity
        options={carouselOptions}
        static
        className={twMerge(
          'relative w-[calc(100%_+_0.75rem)] transition-opacity duration-300',
          isReady ? '' : 'opacity-0',
          isDraggable && '[&_.flickity-button]:hidden',
        )}
        flickityRef={setupFlickityRef}
      >
        {projectsWithLiveIncentives.map((project) => (
          <ProjectItemBox
            slug={project.slug}
            key={project.slug}
            analyticsSource={'Homepage Trending Projects'}
            displayMode="spotlight"
            className="lg:max-w-[calc(33%_-_0.5rem)] max-w-[296px] ml-3"
            lazyload={false}
          />
        ))}
      </Flickity>
    </div>
  );
}
