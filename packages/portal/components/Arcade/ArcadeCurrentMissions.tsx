import { Card } from '../Card';
import { ArcadeWeekPlan } from './ArcadeWeekPlan';
import { ARCADE_WEEKLY_PLAN } from './plans';

export const ArcadeCurrentMissions = ({ currentWeekIndex }: { currentWeekIndex: number }) => {
  return (
    <div className="flex flex-col gap-[80px] lg:gap-[150px]">
      <div className="flex flex-col gap-[50px]">
        {/* Video for the week */}
        <Card className="relative col-span-1 m-auto h-[300px] border border-white/20 p-0 sm:col-span-4 lg:row-span-4 lg:h-[400px] lg:text-xl">
          <iframe
            width="100%"
            height="100%"
            src="https://www.youtube.com/embed/RDRGJKrrv6k?si=8AqEMImTyDVUQ28t&rel=0"
            title={`Arcade week ${currentWeekIndex + 1} video`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </Card>

        {/* Current week */}
        <ArcadeWeekPlan arcadeWeek={ARCADE_WEEKLY_PLAN[currentWeekIndex]} />
      </div>

      {/* Upcoming week */}
      {currentWeekIndex < ARCADE_WEEKLY_PLAN.length - 1 && (
        <ArcadeWeekPlan locked arcadeWeek={ARCADE_WEEKLY_PLAN[currentWeekIndex + 1]} />
      )}
    </div>
  );
};
