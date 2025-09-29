'use client';

import { usePostHog } from 'posthog-js/react';
import { BookmarkIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkedIcon } from '@heroicons/react/24/solid';
import { twMerge } from 'tailwind-merge';
import Image from 'next/image';
import { SidePanel } from '@/components/SidePanel';
import { ExternalLink } from '@/components/ExternalLink';
import { Card } from '@/components/Card';
import { SimilarProjects } from './SimilarProjects';
import { LinksWidget } from './LinksWidget';
import { ChainInfoWidget } from './ChainInfoWidget';
import { PlatformsWidget } from './PlatformsWidget';
import { NFTWidget } from './NFTWidget';
import { AuditWidget } from './AuditWidget';
import { GithubWidget } from './GithubWidget';
import { TeamWidget } from './TeamWidget';
import { VideoWidget } from './VideoWidget';
import { useArbQueryParams } from '@/hooks/useArbQueryParams';
import { useEntitySidePanel } from '@/hooks/useEntitySidePanel';
import { getProjectDetailsById } from '@/common/projects';
import IconLink from '@/public/images/link.svg';
import { EntityType } from '@/common/types';
import { useBookmarkedProjects } from '@/hooks/useBookmarkedProjects';
import { Tooltip } from '@/components/Tooltip';
import { DyorChecklist } from '@/components/DyorChecklist';
import { DisclaimerWidget } from './DisclaimerWidget';

export const ProjectPanel = () => {
  const posthog = usePostHog();
  const [{ project: projectSlug }] = useArbQueryParams();
  const { closeEntitySidePanel: closeProjectPanel } = useEntitySidePanel(
    EntityType.Project,
  );
  const project = getProjectDetailsById(projectSlug);
  const { isBookmarkedProject, addBookmarkedProject, removeBookmarkedProject } =
    useBookmarkedProjects();

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
              {project.subcategories.slice(0, 2).map((subcategory) => (
                <span
                  key={`${project.id}-${subcategory.id}`}
                  className="inline-flex items-start justify-start gap-2 truncate break-words rounded bg-white/25 px-1.5 py-0.5 text-xs font-normal text-white"
                >
                  {subcategory.title}
                </span>
              ))}

              {project.meta.isArbitrumNative && (
                <span className="inline-flex cursor-help items-start justify-start gap-2 break-words rounded bg-ocl-blue px-1.5 py-0.5 text-xs font-normal text-white">
                  <Tooltip
                    content={
                      <p className="text-xs">
                        Arbitrum Native - Projects that either operate
                        exclusively on Arbitrum or launched on Arbitrum as one
                        of their primary deployments.
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

        <div className="grid grid-cols-4 gap-4 lg:grid-cols-4">
          <ChainInfoWidget project={project} />
        </div>
        {/* Links to social media */}
        <LinksWidget entityDetails={project} />

        {/* Video widget on top if Gaming category */}
        {project.categoryIds.includes('gaming') && (
          <VideoWidget project={project} />
        )}
        <div className="flex flex-col flex-nowrap gap-4 lg:flex-row">
          {/* Team and Org details */}
          <TeamWidget project={project} />

          {/* NFT Minting details */}
          <NFTWidget project={project} />

          {/* Code and Github */}
          <GithubWidget project={project} />

          {/* Audits */}
          <AuditWidget project={project} />

          {/* Platforms */}
          <PlatformsWidget project={project} />
        </div>

        {/* Video widget at bottom if Defi category */}
        {project.categoryIds.includes('defi') && (
          <VideoWidget project={project} />
        )}

        {/* Disclaimer for details of project */}
        <DisclaimerWidget />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:flex-row">
          <DyorChecklist
            project={project}
            className="col-span-1 lg:col-span-2"
          />
          <SimilarProjects project={project} className="col-span-1" />
        </div>
      </div>
    </SidePanel>
  );
};
