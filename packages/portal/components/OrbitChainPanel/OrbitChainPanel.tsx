'use client';

import { usePostHog } from 'posthog-js/react';
import { ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { twMerge } from 'tailwind-merge';
import Image from 'next/image';
import { SidePanel } from '@/components/SidePanel';
import { ExternalLink } from '@/components/ExternalLink';
import { Card } from '@/components/Card';
import { useArbQueryParams } from '@/hooks/useArbQueryParams';
import { useEntitySidePanel } from '@/hooks/useEntitySidePanel';
import IconLink from '@/public/images/link.svg';
import { getOrbitChainDetailsById } from '@/common/orbitChains';
import { EntityType } from '@/common/types';
import { LinksWidget } from '@/components/ProjectPanel/LinksWidget';
import { MISSIONS } from '@/common/missions';
import { MissionCard } from '@/components/Missions/MissionCard';
import { ProjectsOnOrbitChain } from './ProjectsOnOrbitChain';
import { OrbitTeamMembers } from './OrbitTeamMembers';
import { OrbitChainDetailsTable } from './OrbitChainDetailsTable';
import { OrbitStatusBadge } from '@/components/OrbitStatusBadge';
import { OrbitTvlBadge } from '@/components/OrbitTvlBadge';
import { DisclaimerWidget } from '@/components/ProjectPanel/DisclaimerWidget';

export const OrbitChainPanel = () => {
  const posthog = usePostHog();
  const [{ orbitChain: orbitChainSlug }] = useArbQueryParams();
  const { closeEntitySidePanel: closeOrbitSidePanel } = useEntitySidePanel(
    EntityType.OrbitChain,
  );
  const orbitChain = getOrbitChainDetailsById(orbitChainSlug);

  // if no orbitChain corresponds to the one passed in query params then no need of this dialog
  if (!orbitChain) return null;

  const relatedMissions = MISSIONS.filter((mission) => {
    return mission.teamsInvolved.some(
      (teamName) => teamName.toLowerCase() === orbitChain.title.toLowerCase(),
    );
  });

  const primaryColor = orbitChain.color.primary;

  return (
    <SidePanel
      isOpen={!!orbitChain}
      onClose={closeOrbitSidePanel}
      className="bg-black"
      panelClassName="w-full orbitChain-panel"
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
            onClick={closeOrbitSidePanel}
          />
          <button
            onClick={closeOrbitSidePanel}
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
              orbitChain.images.bannerUrl
                ? { backgroundImage: `url(${orbitChain.images.bannerUrl})` }
                : {}
            }
          />

          <div className="z-10 mt-[-60px] flex flex-row items-end justify-between px-6">
            {/* Profile pic */}
            <Image
              alt={`${orbitChain.title} Logo`}
              src={orbitChain.images.logoUrl}
              width={120}
              height={120}
              className="overflow-hidden rounded-lg border-[5px] border-default-black/10 bg-default-black"
            />

            {/* Website link CTA */}
            {orbitChain.links.website && (
              <ExternalLink
                className="flex h-[40px] items-center gap-2 whitespace-nowrap rounded-md bg-white/10 p-3 hover:bg-[#333]"
                href={orbitChain.links.website}
                onClick={() => {
                  posthog?.capture('Orbit Panel Clicks', {
                    Link: 'Website',
                  });
                }}
              >
                <Image
                  src={IconLink}
                  alt={`Visit "${orbitChain.title}" app`}
                  className={twMerge('h-5 w-5')}
                />
                Visit Website
              </ExternalLink>
            )}
          </div>

          <div className="flex flex-col gap-4 px-6 pb-6">
            {/* Title */}
            <div className="z-20 flex flex-nowrap items-center justify-between gap-4">
              <div className="text-xl font-bold lg:text-3xl">
                {orbitChain.title}
              </div>
            </div>
            <div className="flex flex-wrap justify-start gap-3 text-center leading-6 text-gray-700">
              <OrbitStatusBadge status={orbitChain.chain.status} />

              <OrbitTvlBadge slug={orbitChain.slug} />
            </div>
            {orbitChain.description}
          </div>
        </Card>

        <div className="flex flex-col flex-nowrap gap-4 lg:flex-row">
          <OrbitTeamMembers
            orbitChain={orbitChain}
            className="w-full shrink-0 lg:w-[250px]"
          />

          {/* Status and Chain Type widget */}
          <div className="flex w-full flex-col justify-between gap-4">
            <Card className="flex h-full items-center p-6">
              <div className="flex h-full w-1/2 flex-col justify-center">
                <div className="text-lg">Status</div>
                <div className="text-sm opacity-50">
                  {orbitChain.chain.status || '-'}
                </div>
              </div>

              <div className="flex h-full w-1/2 flex-col justify-center border-l border-white/20 pl-8">
                <div className="text-lg">Chain Type</div>
                <div className="text-sm opacity-50">
                  {orbitChain.chain.type || '-'}
                </div>
              </div>
            </Card>
            {orbitChain.chain.bridgeUrl && (
              <Card
                className="group relative flex h-[60px] items-center justify-between p-6 text-lg hover:opacity-80"
                style={
                  primaryColor ? { backgroundColor: `${primaryColor}40` } : {}
                }
                cardType="externalLink"
                href={orbitChain.chain.bridgeUrl}
              >
                Bridge funds to {orbitChain.title}
                <ArrowRightIcon className="align-center bottom-6 right-4 flex h-4 w-4 justify-center" />
              </Card>
            )}
          </div>
        </div>

        <LinksWidget entityDetails={orbitChain} />

        {relatedMissions.length > 0 ? (
          <div className="col-span-4 row-span-2 my-8 flex flex-col gap-4">
            <div className="text-xl">
              Ongoing Quest{relatedMissions.length > 1 ? 's' : ''}
            </div>
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2">
              {relatedMissions.map((mission, index) => (
                <MissionCard
                  key={`oribitChain-mission-${index}`}
                  mission={mission}
                />
              ))}
            </div>
          </div>
        ) : null}

        <OrbitChainDetailsTable orbitChain={orbitChain} />

        <DisclaimerWidget />

        <ProjectsOnOrbitChain orbitChainSlug={orbitChainSlug} />
      </div>
    </SidePanel>
  );
};
