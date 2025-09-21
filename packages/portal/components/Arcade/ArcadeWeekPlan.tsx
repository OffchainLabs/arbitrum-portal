import dynamic from 'next/dynamic';
import { twMerge } from 'tailwind-merge';
import { PropsWithChildren } from 'react';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { ArcadeProjectWithMissionLink } from './ArcadeProjectWithMissionLink';
import { ArcadeWeeklyPlan } from './plans';
import { formatDate, parseDateInEasternTime } from '@/common/dateUtils';
import {
  ARCADE_LOCKED_PROJECT_DETAILS,
  getProjectDetailsById,
} from '@/common/projects';

const Countdown = dynamic(() => import('@/components/Countdown'), {
  ssr: false,
});

export const ArcadeLabel = ({ children }: PropsWithChildren) => {
  return <div className="mt-3 text-lg text-white">{children}</div>;
};

export const ArcadeValue = ({ children }: PropsWithChildren) => {
  return <div className="text-sm text-gray-400">{children}</div>;
};

export const ArcadeWeekPlan = ({
  arcadeWeek,
  locked = false,
  className,
  gridClassName,
}: {
  arcadeWeek?: ArcadeWeeklyPlan;
  locked?: boolean;
  className?: string;
  gridClassName?: string;
}) => {
  if (!arcadeWeek) return null;

  return (
    <div className={twMerge('relative flex flex-col gap-4', className)}>
      <div className="text-3xl">{arcadeWeek.title}</div>

      {/* Content */}
      <div className={twMerge('flex flex-col gap-4')}>
        <div className="flex flex-wrap gap-4 lg:gap-12">
          <div>
            <ArcadeLabel>Timeframe</ArcadeLabel>
            <ArcadeValue>
              {formatDate(arcadeWeek.missionTimeStart)} -{' '}
              {formatDate(arcadeWeek.missionTimeEnd)}
            </ArcadeValue>
          </div>
        </div>
        <div
          className={twMerge(
            'relative grid gap-4 bg-black sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2',
            gridClassName,
          )}
        >
          {locked && (
            <div className="absolute z-10 flex h-full w-full flex-col items-center justify-center gap-4 text-3xl text-white">
              <div className="flex items-center gap-2 text-lg">
                <LockClosedIcon className="h-4 w-4" />
                Chapter unlocks in
              </div>
              <Countdown
                toDate={parseDateInEasternTime(
                  arcadeWeek.missionTimeStart,
                ).valueOf()}
              />
            </div>
          )}

          {arcadeWeek.missions.map((mission) => {
            const projectDetails = getProjectDetailsById(mission.projectId);

            if (!projectDetails) return null;

            return (
              <div
                key={`arcade-mission-${mission.projectId}`}
                className={twMerge(
                  'flex flex-col justify-between gap-2',
                  locked &&
                    'pointer-events-none select-none opacity-50 blur-lg filter',
                )}
              >
                <ArcadeProjectWithMissionLink
                  projectSlug={
                    locked
                      ? ARCADE_LOCKED_PROJECT_DETAILS.slug
                      : projectDetails.slug
                  }
                  missionLink={locked ? '#' : mission.missionDetailsLink}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
