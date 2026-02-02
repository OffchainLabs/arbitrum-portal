'use client';

import { ArrowTopRightOnSquareIcon, BookmarkIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkedIcon } from '@heroicons/react/24/solid';
import dayjs from 'dayjs';
import Image from 'next/image';
import { usePostHog } from 'posthog-js/react';
import { twMerge } from 'tailwind-merge';

import { LIVE_INCENTIVES_END_DATE, LIVE_INCENTIVES_START_DATE } from '@/common/constants';
import { getProjectDetailsById, hasLiveIncentives as hasLiveIncentivesFn } from '@/common/projects';
import { EntityType } from '@/common/types';
import { Card } from '@/components/Card';
import { DyorChecklist } from '@/components/DyorChecklist';
import { ExternalLink } from '@/components/ExternalLink';
import { SidePanel } from '@/components/SidePanel';
import { Tooltip } from '@/app/components/common/Tooltip';
import { useArbQueryParams } from '@/hooks/useArbQueryParams';
import { useBookmarkedProjects } from '@/hooks/useBookmarkedProjects';
import { useEntitySidePanel } from '@/hooks/useEntitySidePanel';
import IconLink from '@/public/images/link.svg';

import { LiveIncentivesBadge } from '../LiveIncentivesBadge';
import { AuditWidget } from './AuditWidget';
import { ChainInfoWidget } from './ChainInfoWidget';
import { DisclaimerWidget } from './DisclaimerWidget';
import { GithubWidget } from './GithubWidget';
import { LinksWidget } from './LinksWidget';
import { PlatformsWidget } from './PlatformsWidget';
import { SimilarProjects } from './SimilarProjects';
import { TeamWidget } from './TeamWidget';
import { VideoWidget } from './VideoWidget';

export const ProjectPanel = () => {
  const posthog = usePostHog();
  const [{ project: projectSlug }] = useArbQueryParams();
  const { closeEntitySidePanel: closeProjectPanel } = useEntitySidePanel(EntityType.Project);
  const project = getProjectDetailsById(projectSlug);
  const { isBookmarkedProject, addBookmarkedProject, removeBookmarkedProject } =
    useBookmarkedProjects();

  // Check if project has live incentives
  const hasLiveIncentives = hasLiveIncentivesFn(projectSlug);
  const liveIncentivesEnded = dayjs().isAfter(dayjs(LIVE_INCENTIVES_END_DATE));

  // if no project corresponds to the one passed in query params then no need of this dialog
  if (!project) return null;

  const isBookmarked = isBookmarkedProject(projectSlug);

  return (
    <SidePanel
      isOpen={!!projectSlug}
      onClose={closeProjectPanel}
      className="bg-black"
      panelClassName="w-full project-panel"
    >
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 p-6">
        {/* Close panel buttons */}
        <div className="mb-2 flex flex-row flex-nowrap items-center justify-between lg:justify-end">
          <Image
            alt="Arbitrum"
            src="/images/arbitrum-logo-white-no-text.svg"
            width={28}
            height={28}
            className="flex cursor-pointer lg:hidden"
            onClick={closeProjectPanel}
          />
          <button
            onClick={closeProjectPanel}
            className="flex cursor-pointer flex-row flex-nowrap items-center gap-1 rounded-md bg-default-black bg-white/10 p-2 outline-none outline-0 hover:bg-[#333] lg:px-3"
          >
            <XMarkIcon className="h-5 w-5 stroke-white" />
            <span className="hidden text-sm lg:flex"> Close</span>
          </button>
        </div>

        {/* Top widget */}
        <Card className="flex flex-col gap-4 bg-default-black p-0">
          {/* Cover pic */}
          <div
            className="relative top-0 aspect-3/1 w-full rounded-lg bg-cover bg-top bg-no-repeat lg:bg-center"
            style={
              project.images.bannerUrl
                ? { backgroundImage: `url(${project.images.bannerUrl})` }
                : {}
            }
          />

          <div className="z-10 mt-[-75px] flex min-h-[120px] flex-row items-end justify-between px-6">
            {/* Profile pic */}
            <Image
              alt={`${project.title} Logo`}
              src={project.images.logoUrl}
              width={120}
              height={120}
              className="overflow-hidden rounded-lg border-[5px] border-default-black/10 bg-default-black"
            />

            {/* Website link CTA */}
            {project.links.website && (
              <ExternalLink
                className="flex h-[40px] items-center gap-2 whitespace-nowrap rounded-md bg-white/10 p-3 hover:bg-[#333]"
                href={project.links.website}
                onClick={() => {
                  posthog?.capture('Project Panel Clicks', {
                    Link: 'Website',
                  });
                }}
              >
                <Image
                  src={IconLink}
                  alt={`Visit "${project.title}" app`}
                  className={twMerge('h-5 w-5')}
                />
                Visit Website
              </ExternalLink>
            )}
          </div>

          <div className="flex flex-col gap-4 px-6 pb-6">
            {/* Title and bookmark logos */}
            <div className="z-20 flex flex-nowrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-xl font-bold lg:text-3xl">
                {project.title}{' '}
                <Tooltip
                  content={
                    <p className="text-xs">
                      {isBookmarked
                        ? 'Project bookmarked. Click to remove.'
                        : 'Bookmark this project'}
                    </p>
                  }
                >
                  <button
                    className="rounded-md p-2 hover:bg-white/20"
                    onClick={() => {
                      const analyticsProps = {
                        project: project.title,
                        Element: 'Project Panel',
                      };

                      if (isBookmarked) {
                        removeBookmarkedProject(projectSlug, analyticsProps);
                      } else {
                        addBookmarkedProject(projectSlug, analyticsProps);
                      }
                    }}
                  >
                    {isBookmarked ? (
                      <BookmarkedIcon className="h-4 w-4" />
                    ) : (
                      <BookmarkIcon className="h-4 w-4" />
                    )}
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Tags */}
            <p className="flex flex-wrap justify-start gap-3 text-center leading-6 text-white">
              {!project.meta.isLive && (
                <span className="inline-flex items-start justify-start gap-2 break-words rounded bg-orange px-1.5 py-0.5 text-xs font-normal text-dark-lime">
                  Coming Soon
                </span>
              )}
              {hasLiveIncentives && <LiveIncentivesBadge />}
              {project.subcategories.slice(0, 2).map((subcategory) => (
                <span
                  key={`${project.id}-${subcategory.id}`}
                  className="inline-flex items-start justify-start gap-2 truncate break-words rounded-sm bg-white/25 px-1.5 py-0.5 text-xs font-normal text-white"
                >
                  {subcategory.title}
                </span>
              ))}

              {project.meta.isArbitrumNative && (
                <span className="inline-flex cursor-help items-start justify-start gap-2 break-words rounded bg-ocl-blue px-1.5 py-0.5 text-xs font-normal text-white">
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
            </p>

            {project.description}
          </div>
        </Card>

        {hasLiveIncentives && (
          <div
            className={
              'relative flex flex-col md:items-center gap-3 md:flex-row bg-gradient-to-b from-[rgba(153,242,78,0.10)] to-[rgba(8,214,243,0.10)] rounded-lg p-4'
            }
          >
            <div className="flex items-center gap-2 font-normal shrink-0">
              <Image src="/icons/liveIncentives.svg" alt="Live Incentives" width={20} height={20} />
              <span>Active Incentives Live on {project.title}</span>
            </div>
            <div
              className={twMerge(
                'relative overflow-hidden h-[5px] w-full bg-white/20 rounded-lg',
                !liveIncentivesEnded && 'md:max-w-[440px]',
              )}
            >
              <div
                className="absolute h-full top-0 left-0 rounded bg-gradient-to-r from-[#99F24E] to-[#08D6F3] animate-progress-bar"
                style={{
                  width:
                    ((new Date().getTime() - new Date(LIVE_INCENTIVES_START_DATE).getTime()) /
                      (new Date(LIVE_INCENTIVES_END_DATE).getTime() -
                        new Date(LIVE_INCENTIVES_START_DATE).getTime())) *
                      100 +
                    '%',
                }}
              />
            </div>
            {!liveIncentivesEnded && (
              <div className="flex w-full md:w-fit justify-between ml-auto shrink-0">
                <span className="md:hidden text-white/50">End Date</span>
                <span className="shrink-0">
                  {dayjs(LIVE_INCENTIVES_END_DATE).format('MMM D, YYYY')}
                </span>
              </div>
            )}
            <ExternalLink
              className="bg-white/10 rounded-md w-5 h-5 flex items-center justify-center absolute top-5 right-5 md:top-auto md:right-auto md:relative hover:bg-white/20"
              href={project.links.website ?? ''}
            >
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </ExternalLink>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 lg:grid-cols-4">
          <ChainInfoWidget project={project} />
        </div>
        {/* Links to social media */}
        <LinksWidget entityDetails={project} />

        {/* Video widget on top if Gaming category */}
        {project.categoryIds.includes('gaming') && <VideoWidget project={project} />}
        <div className="flex flex-col flex-nowrap gap-4 lg:flex-row">
          {/* Team and Org details */}
          <TeamWidget project={project} />

          {/* Code and Github */}
          <GithubWidget project={project} />

          {/* Audits */}
          <AuditWidget project={project} />

          {/* Platforms */}
          <PlatformsWidget project={project} />
        </div>

        {/* Video widget at bottom if Defi category */}
        {project.categoryIds.includes('defi') && <VideoWidget project={project} />}

        {/* Disclaimer for details of project */}
        <DisclaimerWidget />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:flex-row">
          <DyorChecklist project={project} className="col-span-1 lg:col-span-2" />
          <SimilarProjects project={project} className="col-span-1" />
        </div>
      </div>
    </SidePanel>
  );
};
