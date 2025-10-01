'use client';

import Image from 'next/image';
import { usePostHog } from 'posthog-js/react';
import { useCallback } from 'react';

import { getProjectDetailsById } from '@/common/projects';
import { ExternalLink } from '@/components/ExternalLink';
import { ProjectItemBox } from '@/components/ProjectItemBox';
import ExternalLinkIcon from '@/public/images/link.svg';

export const ArcadeProjectWithMissionLink = ({
  projectSlug,
  missionLink,
}: {
  projectSlug: string;
  missionLink: string;
}) => {
  const posthog = usePostHog();
  const projectDetails = getProjectDetailsById(projectSlug);

  const captureArcadeProjectEvent = useCallback(() => {
    posthog?.capture('Arcade Page Clicks', {
      Project: projectDetails?.title,
    });
  }, [posthog, projectDetails?.title]);

  const captureArcadeLinkEvent = useCallback(() => {
    posthog?.capture('Arcade Page Clicks', {
      Galxe: projectDetails?.title,
    });
  }, [posthog, projectDetails?.title]);

  if (!projectDetails) {
    return null;
  }

  return (
    <>
      <ProjectItemBox
        slug={projectDetails.slug}
        lazyload={false}
        className="w-full grow"
        onClick={captureArcadeProjectEvent}
      />
      <ExternalLink
        className="flex w-full grow-0 justify-center gap-2 whitespace-nowrap rounded-lg bg-arb-one-blue p-3"
        href={missionLink}
        onClick={captureArcadeLinkEvent}
      >
        See details
        <Image src={ExternalLinkIcon} alt={`View mission details`} className="h-6 w-6" />
      </ExternalLink>
    </>
  );
};
