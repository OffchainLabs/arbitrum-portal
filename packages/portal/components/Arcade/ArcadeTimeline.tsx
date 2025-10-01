import { twMerge } from 'tailwind-merge';

import { ARCADE_WEEKLY_PLAN } from './plans';

export const ArcadeTimeline = ({ currentWeekIndex }: { currentWeekIndex: number }) => {
  if (currentWeekIndex < 0) currentWeekIndex = 0;
  if (currentWeekIndex >= ARCADE_WEEKLY_PLAN.length)
    currentWeekIndex = ARCADE_WEEKLY_PLAN.length - 1;

  return (
    <div className="relative w-full">
      <div className="flex w-full flex-nowrap items-center justify-between text-sm">
        {[...Array(ARCADE_WEEKLY_PLAN.length)].map((_, index) => {
          return (
            <div
              className={twMerge(
                'flex flex-col items-center justify-center whitespace-nowrap',
                index <= currentWeekIndex ? 'text-white' : 'text-white/40',
                index === currentWeekIndex ? 'text-sm' : 'text-xs',
              )}
              key={`arcade-timeline-dot-${index}`}
            >
              {/* Label */}
              <div
                className={twMerge(
                  'absolute -top-6 hidden lg:flex',
                  index === currentWeekIndex ? 'flex' : '',
                )}
              >
                Chapter {index + 1}
              </div>

              {/* Dot */}
              <div
                className={twMerge(
                  'z-10 box-content h-2 w-2 rounded-full border-[5px] border-black bg-gray-700',
                  index <= currentWeekIndex && 'bg-white',
                  index === currentWeekIndex && 'h-4 w-4 font-bold',
                )}
              />
            </div>
          );
        })}
      </div>
      <div className="absolute mt-[-18px] flex w-full flex-nowrap justify-between p-1 text-sm">
        {[...Array(ARCADE_WEEKLY_PLAN.length - 1)].map((_, index) => {
          return (
            <div
              className={twMerge(
                'w-full border-2',
                index < currentWeekIndex ? 'border-white' : 'border-white/40',
              )}
              key={`arcade-timeline-border-${index}`}
            />
          );
        })}
      </div>
    </div>
  );
};
