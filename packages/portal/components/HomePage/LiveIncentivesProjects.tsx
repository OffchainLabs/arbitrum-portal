import Image from 'next/image';
import { twMerge } from 'tailwind-merge';

import { getDripProgramCompactInfo, getProjectsWithLiveIncentives } from '@/common/projects';

import { LiveIncentivesBadge } from '../LiveIncentivesBadge';
import { ProjectItemBox } from '../ProjectItemBox';
import { ResponsiveHorizontalScrollableLayout } from '../ResponsiveHorizontalScrollableLayout';

export function LiveIncentivesProjects() {
  const dripProgramCompactInfo = getDripProgramCompactInfo();
  const LIVE_INCENTIVES_PROJECTS = getProjectsWithLiveIncentives(dripProgramCompactInfo);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-2xl flex items-center gap-2">
        <Image src="/icons/liveIncentives.svg" alt="Live Incentives" width={24} height={24} />
        <span>Live Incentives</span>
      </div>
      <div className="-mt-4 text-sm opacity-70">Choose your opportunity and claim your rewards</div>
      <hr className="border-white/40" />

      <ResponsiveHorizontalScrollableLayout>
        {LIVE_INCENTIVES_PROJECTS.slice(0, 3).map((project) => (
          <ProjectItemBox
            slug={project.slug}
            key={project.slug}
            analyticsSource={'Homepage Trending Projects'}
            displayMode="spotlight"
            className={'max-w-[300px] lg:max-w-none'}
          >
            <LiveIncentivesBadge className="absolute top-3 left-4" />
          </ProjectItemBox>
        ))}
      </ResponsiveHorizontalScrollableLayout>
    </div>
  );
}
