'use client';

import React from 'react';
import Image from 'next/image';
import LazyLoad from 'react-lazyload';
import { twMerge } from 'tailwind-merge';
import { usePostHog } from 'posthog-js/react';
import { useEntitySidePanel } from '@/hooks/useEntitySidePanel';
import { ItemBoxProps } from './ProjectItemBox';
import { getOrbitChainDetailsById } from '@/common/orbitChains';
import { EntityType } from '@/common/types';
import { getProjectsCountForChain } from '@/common/projects';
import { ExternalLink } from './ExternalLink';
import { OrbitSpotlightProjectPreview } from './OrbitSpotlightProjectPreview';
import { OrbitStatusBadge } from './OrbitStatusBadge';
import { OrbitTvlBadge } from './OrbitTvlBadge';

const ItemContent = ({
  slug,
  displayMode,
  analyticsSource,
  onClick,
}: Pick<
  ItemBoxProps,
  'slug' | 'displayMode' | 'analyticsSource' | 'onClick'
>) => {
  const orbitChain = getOrbitChainDetailsById(slug);
  const { openEntitySidePanel: openOrbitChainSidePanel } = useEntitySidePanel(
    EntityType.OrbitChain,
  );
  const isSpotlightMode = displayMode === 'spotlight';

  const posthog = usePostHog();

  if (!orbitChain) {
    return null;
  }

  const { title, images, description } = orbitChain;

  function sendClickEvent() {
    posthog?.capture('Orbit Chain Click', {
      project: title,
      Element: analyticsSource,
    });
  }

  const handleItemClick = () => {
    if (slug) {
      openOrbitChainSidePanel(slug);
      sendClickEvent();
      onClick?.(); // success callback for attaching more events
    }
  };

  const projectsOnOrbitChain = getProjectsCountForChain(title);

  return (
    <button
      className={twMerge(
        'relative flex h-full w-full flex-col hover:opacity-100',
        isSpotlightMode
          ? 'group flex flex-nowrap justify-between gap-8 overflow-hidden rounded-md p-10 lg:flex-row lg:gap-6'
          : 'gap-2',
      )}
      aria-label={`${title} Website`}
      onClick={handleItemClick}
    >
      {/* Show cover-pic with the tile if it's a spotlight mode */}
      {displayMode === 'spotlight' && images.bannerUrl && (
        <>
          <div className="absolute left-0 top-0 z-10 h-full w-full bg-gradient-to-t from-black/70 from-[25%] to-transparent" />
          <div className="absolute left-0 top-0 z-10 h-full w-full bg-gradient-to-r from-black/70 from-[25%] to-transparent" />
          <Image
            alt={`${title} banner`}
            src={images.bannerUrl}
            layout="fill"
            objectFit="cover"
            className="z-0"
          />
        </>
      )}
      {/* Normal orbit-chain contents */}
      <div
        className={twMerge(
          'z-10 flex flex-col gap-4',
          isSpotlightMode && 'w-full lg:w-1/3',
        )}
      >
        {/* Logos */}
        <div className="flex shrink-0 grow-0 flex-col gap-2 overflow-hidden bg-cover bg-center">
          {/* Chain logo */}
          <div
            className={twMerge(
              'relative inline-block h-[40px] w-[40px] max-w-[70px] overflow-hidden rounded-md bg-black/80',
              isSpotlightMode ? 'p-2' : 'border border-white',
            )}
          >
            <div className="[&:hover_span]:opacity-100">
              <Image
                alt={`${title} logo`}
                src={images.logoUrl}
                width={40}
                height={40}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative grow text-left">
          <div className="flex flex-col gap-2">
            <h5 className="flex items-center gap-2 text-left text-lg font-semibold leading-7">
              {title}
            </h5>

            {!isSpotlightMode && projectsOnOrbitChain > 0 && (
              <span className="text-xs opacity-50">
                {projectsOnOrbitChain}{' '}
                {`project${projectsOnOrbitChain === 1 ? '' : 's'}`}
              </span>
            )}

            <p
              className={twMerge(
                'line-clamp-3 text-sm opacity-70',
                isSpotlightMode && 'opacity-90',
              )}
            >
              {description}
            </p>

            <div className="mt-3 flex flex-nowrap gap-2">
              {!isSpotlightMode && (
                <OrbitStatusBadge status={orbitChain.chain.status} />
              )}

              {!isSpotlightMode && <OrbitTvlBadge slug={slug} />}

              {isSpotlightMode && orbitChain.chain.bridgeUrl && (
                <ExternalLink
                  href={orbitChain.chain.bridgeUrl}
                  className="rounded-md bg-white p-2 text-xs text-default-black hover:bg-white/80"
                >
                  Bridge to {title}
                </ExternalLink>
              )}
            </div>
          </div>
        </div>
      </div>

      {isSpotlightMode && (
        <OrbitSpotlightProjectPreview
          orbitChainSlug={slug}
          className="h-full w-full lg:w-[540px] lg:min-w-[400px]"
        />
      )}
    </button>
  );
};

export const OrbitItemBox = ({
  slug,
  displayMode = 'normal',
  className,
  lazyload = true, // `lazyload` option false will render the card without lazy-loading. eg. in search preview / carousel etc.
  analyticsSource, // source from where this orbit-chain was rendered - helpful for tracking analytics
  onClick, // optional function that can be passed when orbit-chain is clicked
}: ItemBoxProps) => {
  const orbitChain = getOrbitChainDetailsById(slug);
  const isSpotlightMode = displayMode === 'spotlight';

  if (!orbitChain) {
    return null;
  }

  return (
    <div
      className={twMerge(
        'relative min-h-[130px] overflow-hidden rounded-md bg-default-black p-4 hover:bg-default-black-hover',
        displayMode === 'preview' ? 'rounded-none border-none' : '',
        isSpotlightMode ? 'p-0' : '',
        className,
      )}
    >
      {lazyload ? (
        <LazyLoad height="220px" once offset={100} className={`h-full`}>
          <ItemContent
            slug={slug}
            displayMode={displayMode}
            analyticsSource={analyticsSource}
            onClick={onClick}
          />
        </LazyLoad>
      ) : (
        <ItemContent
          slug={slug}
          displayMode={displayMode}
          analyticsSource={analyticsSource}
          onClick={onClick}
        />
      )}
    </div>
  );
};
