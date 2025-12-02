import Image from 'next/image';
import { twMerge } from 'tailwind-merge';

import {
  getDripProgram,
  getDripProgramCompactInfo,
  getProjectsWithLiveIncentives,
} from '@/common/projects';

import { LiveIncentivesBadge } from '../LiveIncentivesBadge';
import { ProjectItemBox } from '../ProjectItemBox';
import { ResponsiveHorizontalScrollableLayout } from '../ResponsiveHorizontalScrollableLayout';

export function LiveIncentivesProjects() {
  const dripProgram = getDripProgram();
  const dripProgramCompactInfo = getDripProgramCompactInfo(dripProgram);
  const LIVE_INCENTIVES_PROJECTS = getProjectsWithLiveIncentives(dripProgramCompactInfo);

  console.log('dripProgramCompactInfo:', Object.keys(dripProgramCompactInfo));
  console.log('LIVE_INCENTIVES_PROJECTS:', LIVE_INCENTIVES_PROJECTS);

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
            className={twMerge(
              'max-w-[300px] lg:max-w-none',
              'before:absolute before:w-full before:h-full before:top-0 before:left-0 before:bg-live-incentives-gradient before:opacity-70 hover:before:opacity-100 before:transition-opacity before:duration-100',
            )}
          >
            <LiveIncentivesBadge className="absolute top-3 left-4" />
          </ProjectItemBox>
        ))}
      </ResponsiveHorizontalScrollableLayout>
    </div>
  );
}
