'use client';

import { BookmarkIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkedIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { usePostHog } from 'posthog-js/react';
import React from 'react';
import LazyLoad from 'react-lazyload';
import { twMerge } from 'tailwind-merge';

import { Tooltip } from '@/app/components/common/Tooltip';
import { formatOptionalDate } from '@/common/dateUtils';
import { getProjectDetailsById, hasLiveIncentives } from '@/common/projects';
import { EntityCardDisplayMode, EntityType, FullProject, SearchableData } from '@/common/types';
import { Card } from '@/components/Card';
import { useBookmarkedProjects } from '@/hooks/useBookmarkedProjects';
import { useEntitySidePanel } from '@/hooks/useEntitySidePanel';
import ExternalLinkIcon from '@/public/images/link.svg';

import { LiveIncentivesBadge } from './LiveIncentivesBadge';

export type ItemBoxProps = {
  slug: string;
  displayMode?: EntityCardDisplayMode;
  className?: string;
  lazyload?: boolean;
  analyticsSource?: string;
  onClick?: () => void;
};

const BookmarkButton = ({
  displayMode,
  onClick,
  isBookmarked,
  isSpotlightMode,
}: {
  displayMode?: EntityCardDisplayMode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isBookmarked: boolean;
  isSpotlightMode: boolean;
}) => {
  if (displayMode === 'preview' || displayMode === 'compact') return null;

  return (
    <span
      className={twMerge(
        'absolute z-20 rounded-md p-2 hover:bg-white/20',
        isSpotlightMode ? 'right-2 top-2' : 'right-1 top-1',
      )}
      onClick={onClick}
    >
      {isBookmarked ? (
        <BookmarkedIcon className="h-[16px] w-[16px]" />
      ) : (
        <BookmarkIcon className="h-[16px] w-[16px]" />
      )}
    </span>
  );
};

const ItemContent = ({
  slug,
  displayMode,
  analyticsSource,
  onClick,
}: Pick<ItemBoxProps, 'slug' | 'displayMode' | 'analyticsSource' | 'onClick'>) => {
  const project = getProjectDetailsById(slug);
  const { openEntitySidePanel: openProjectPanel } = useEntitySidePanel(EntityType.Project);
  const posthog = usePostHog();
  const { isBookmarkedProject, addBookmarkedProject, removeBookmarkedProject } =
    useBookmarkedProjects();
  const projectHasLiveIncentives = hasLiveIncentives(slug);

  if (!project) {
    return null;
  }

  const { title, subcategories, images, meta, description } = project;
  const isBookmarked = isBookmarkedProject(slug);
  const isSpotlightMode = displayMode === 'spotlight' || displayMode === 'reward-spotlight';
  const isPreviewMode = displayMode === 'preview';
  const isCompactMode = displayMode === 'compact';

  function sendProjectClickEvent() {
    posthog?.capture('Project Click', {
      project: title,
      Element: analyticsSource,
    });
  }

  const handleProjectClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault(); // stop event bubbling if the project card is embedded inside another clickable div

    if (slug) {
      openProjectPanel(slug);
      sendProjectClickEvent();
      onClick?.(); // success callback for attaching more events
    }
  };

  const handleBookmarkButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (slug) {
      const analyticsProps = {
        project: title,
        Element: analyticsSource,
      };
      if (isBookmarked) {
        removeBookmarkedProject(slug, analyticsProps);
      } else {
        addBookmarkedProject(slug, analyticsProps);
      }
    }

    event.stopPropagation();
  };

  return (
    <button
      className={twMerge(
        'relative flex h-full w-full flex-col p-4 hover:opacity-100 overflow-hidden rounded-md',
        isSpotlightMode ? 'group p-0' : 'gap-2',
      )}
      aria-label={`${title} Website`}
      onClick={handleProjectClick}
    >
      <BookmarkButton
        displayMode={displayMode}
        onClick={handleBookmarkButtonClick}
        isBookmarked={isBookmarked}
        isSpotlightMode={isSpotlightMode}
      />
      {/* Show cover-pic with the tile if it's a spotlight mode */}
      {isSpotlightMode && images.bannerUrl && (
        <div
          className="absolute top-0 h-full w-full bg-cover bg-top bg-no-repeat opacity-70 lg:bg-center"
          style={{ backgroundImage: `url(${images.bannerUrl})` }}
        />
      )}{' '}
      {/* Normal project contents */}
      <div
        className={twMerge(
          'flex w-full flex-row gap-2',
          isSpotlightMode
            ? 'z-10 h-full w-full flex-col justify-end gap-3 bg-gradient-to-t from-black/70 to-black/20 p-4 bg-[size:200%] transition-all duration-300 group-hover:bg-bottom bg-top'
            : '',
          isPreviewMode ? 'items-center gap-4' : '',
          isCompactMode ? 'gap-3' : '',
        )}
      >
        {/* Logos */}
        <div className="flex shrink-0 grow-0 flex-col gap-2 overflow-hidden bg-cover bg-center">
          {/* Project logo */}

          <div
            className={twMerge(
              'relative inline-block max-w-[70px] overflow-hidden rounded-md',
              isSpotlightMode ? 'h-[45px] w-[45px]' : 'bg-white p-[1px]',
              isCompactMode ? 'h-[40px] w-[40px]' : '',
            )}
          >
            <div className="[&:hover_span]:opacity-100">
              <Image
                alt={`${title} logo`}
                src={images.logoUrl}
                width={isCompactMode ? 40 : isSpotlightMode ? 45 : 60}
                height={isCompactMode ? 40 : isSpotlightMode ? 45 : 60}
                className="rounded-md"
              />
            </div>

            {project.meta.isArbitrumNative && (
              <span
                className={twMerge(
                  'mt-[1px] flex cursor-help flex-wrap whitespace-break-spaces rounded-md rounded-t-none bg-ocl-blue px-0 py-[5px] text-[10px]',
                )}
                style={{
                  width: isCompactMode ? '40px' : isSpotlightMode ? '45px' : '60px',
                }}
              >
                <Tooltip
                  content={
                    <p className="text-xs">
                      Arbitrum Native - Projects that either operate exclusively on Arbitrum or
                      launched on Arbitrum as one of their primary deployments.
                    </p>
                  }
                >
                  Arbitrum Native
                </Tooltip>
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className={twMerge('relative grow text-left', isSpotlightMode ? 'grow-0' : '')}>
          <div
            className={twMerge(
              'flex flex-col gap-3 px-2',
              isSpotlightMode || isPreviewMode || isCompactMode ? 'gap-1 px-0' : '',
            )}
          >
            <h5
              className={twMerge(
                'relative flex items-center gap-2 text-left text-lg font-semibold leading-7',
                isPreviewMode ? 'text-base' : '',
                isCompactMode ? 'text-sm' : '',
              )}
            >
              {projectHasLiveIncentives && !isSpotlightMode && (
                <Image
                  src="/icons/liveIncentives.svg"
                  alt="Live Incentives"
                  width={18}
                  height={18}
                />
              )}
              {title}
            </h5>
            <p
              className={twMerge(
                'text-sm opacity-70',
                isSpotlightMode || isPreviewMode ? 'line-clamp-2 opacity-100' : 'line-clamp-3',
                isPreviewMode && 'max-w-[90%]',
                isCompactMode && 'hidden',
              )}
            >
              {displayMode === 'reward-spotlight' && project.liveIncentives?.rewards
                ? `Claim ARB rewards on ${project.chains[0]} from ${formatOptionalDate(
                    project.liveIncentives?.startDate ?? null,
                    'MMM DD',
                  )}.`
                : description}
            </p>

            {displayMode === 'reward-spotlight' && project.liveIncentives?.rewards && (
              <span className="z-20 mt-2 w-fit rounded-md bg-black p-1 px-2 font-mono text-xs text-white">
                {project.liveIncentives.rewards / 1000}k ARB Rewards
              </span>
            )}

            {!isSpotlightMode && (
              <p
                className={twMerge(
                  'flex flex-wrap justify-start gap-3 text-center leading-6 text-gray-700',
                  isPreviewMode ? 'absolute right-0 top-0 font-mono uppercase' : '',
                  isCompactMode ? 'gap-1' : '',
                )}
              >
                {!meta.isLive && !isPreviewMode && !isCompactMode && (
                  <span className="inline-flex items-start justify-start gap-2 break-words rounded bg-orange px-1.5 py-0.5 text-xs font-normal text-dark-lime">
                    Coming Soon
                  </span>
                )}
                {subcategories.slice(0, isPreviewMode ? 1 : 2).map((subcategory) => (
                  <span
                    key={subcategory.id}
                    className={twMerge(
                      'inline-flex items-start justify-start gap-2 truncate break-words rounded-sm bg-black px-1.5 py-0.5 text-xs font-normal text-white/60',
                      isCompactMode ? 'bg-white/25 text-white' : '',
                    )}
                  >
                    {isPreviewMode
                      ? subcategory.title.split(' ')[0] // this is to show only the first word of the subcategory in preview mode. eg. 'Infra & Tools (Others)' becomes 'Infra'
                      : // this is to break the title after /, i.e. Lending/Borrowing, which is considered as one word by CSS
                        subcategory.title.replaceAll('/', ' / ')}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      </div>
      {isSpotlightMode && projectHasLiveIncentives && (
        <LiveIncentivesBadge className="absolute top-3 left-4" />
      )}
    </button>
  );
};

const ItemBoxLayout = ({
  project,
  displayMode = 'normal',
  className,
  lazyload = true, // `lazyload` option false will render the card without lazy-loading. eg. in search preview / carousel etc.
  analyticsSource, // source from where this project was rendered - helpful for tracking analytics
  onClick, // optional function that can be passed when project is clicked
}: Omit<ItemBoxProps, 'slug'> & { project: SearchableData<FullProject> }) => {
  const isSpotlightMode = displayMode === 'spotlight' || displayMode === 'reward-spotlight';
  const isPreviewMode = displayMode === 'preview';
  const isCompactMode = displayMode === 'compact';
  const projectHasLiveIncentives = hasLiveIncentives(project.slug);

  return (
    <div
      className={twMerge(
        'relative h-full min-h-[150px] w-full overflow-hidden rounded-md bg-default-black hover:bg-default-black-hover',
        project.meta.isLive ? '' : ' opacity-80',
        displayMode === 'bookmarked' && 'lg:h-[160px]',
        isSpotlightMode && 'h-[200px] rounded-md border border-white/10',
        isPreviewMode && 'h-fit min-h-[100px]',
        isCompactMode && 'h-fit min-h-[50px] bg-transparent',
        projectHasLiveIncentives &&
          'bg-live-incentives-gradient before:absolute before:rounded-md before:top-[1px] before:left-[1px] before:w-[calc(100%_-_2px)] before:h-[calc(100%_-_2px)] before:bg-default-black hover:before:bg-default-black-hover',
        className,
      )}
    >
      {lazyload ? (
        <LazyLoad
          height="165px"
          once
          offset={100}
          className={twMerge(
            `h-full relative rounded-md overflow-hidden`,
            projectHasLiveIncentives && !isSpotlightMode && 'bg-live-incentives-dimmed-gradient',
          )}
        >
          <ItemContent
            slug={project.slug}
            displayMode={displayMode}
            analyticsSource={analyticsSource}
            onClick={onClick}
          />
        </LazyLoad>
      ) : (
        <ItemContent
          slug={project.slug}
          displayMode={displayMode}
          analyticsSource={analyticsSource}
          onClick={onClick}
        />
      )}
    </div>
  );
};

export const ProjectItemBox = ({
  slug,
  displayMode = 'normal',
  className,
  lazyload = true, // `lazyload` option false will render the card without lazy-loading. eg. in search preview / carousel etc.
  analyticsSource, // source from where this project was rendered - helpful for tracking analytics
  onClick, // optional function that can be passed when project is clicked
}: ItemBoxProps) => {
  const project = getProjectDetailsById(slug);

  if (!project) {
    return null;
  }

  // for only bookmarked projects, we want a different layout - having a button under the card
  if (displayMode === 'bookmarked') {
    return (
      <div className={twMerge('relative flex flex-col gap-2')}>
        <ItemBoxLayout
          project={project}
          displayMode={displayMode}
          className={className}
          lazyload={lazyload}
          analyticsSource={analyticsSource}
          onClick={onClick}
        />
        {project.links.website && (
          <Card
            cardType="externalLink"
            href={project.links.website}
            className="relative flex flex-row flex-nowrap items-center justify-start gap-2 bg-default-black-hover p-3 hover:bg-default-black-hover/80"
          >
            <Image src={ExternalLinkIcon} alt={`Visit Website`} className="h-4 w-4" />
            Visit Website
          </Card>
        )}
      </div>
    );
  }

  return (
    <ItemBoxLayout
      project={project}
      displayMode={displayMode}
      className={className}
      lazyload={lazyload}
      analyticsSource={analyticsSource}
      onClick={onClick}
    />
  );
};
