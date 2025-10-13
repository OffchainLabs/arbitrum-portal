import { Metadata } from 'next';

import { getCurrentDateInEasternTime, parseDateInEasternTime } from '@/portal/common/dateUtils';
import { ArcadeBeforeMissions } from '@/portal/components/Arcade/ArcadeBeforeMissions';
import { ArcadeCurrentMissions } from '@/portal/components/Arcade/ArcadeCurrentMissions';
import { ArcadeTimeline } from '@/portal/components/Arcade/ArcadeTimeline';
import { ARCADE_WEEKLY_PLAN } from '@/portal/components/Arcade/plans';
import { Card } from '@/portal/components/Card';
import { MissionsFAQs } from '@/portal/components/Missions/MissionsFAQs';
import { MissionsList } from '@/portal/components/Missions/MissionsList';

const metadataContent = {
  title: 'Arbitrum Arcade',
  description:
    'Welcome to Arbitrum Arcade! An 8-week onchain gameathon designed to highlight the most innovative gaming experiences in web3.',
};

// Generate server-side metadata for this page
export function generateMetadata(): Metadata {
  return {
    title: metadataContent.title,
    description: metadataContent.description,
    openGraph: {
      title: metadataContent.title,
      description: metadataContent.description,
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: metadataContent.title,
      description: metadataContent.description,
    },
  };
}

type OptionalArcadePageParams = {
  searchParams: {
    arcadeWeekIndex?: string;
    project?: string;
  };
};

// With respect to Arcade, get the current week number, so that we can show the plan accordingly
const getCurrentWeekIndex = (hardCodedWeekIndex?: number) => {
  if (
    typeof hardCodedWeekIndex !== 'undefined' &&
    // process.env.NODE_ENV !== 'production' && // comment this check if you want to debug Arcade week on deployed versions
    !isNaN(hardCodedWeekIndex)
  ) {
    // return the hardcoded week index only in dev environment
    // ie. block this query-param in production
    return hardCodedWeekIndex;
  }

  const currentDate = getCurrentDateInEasternTime();

  // return -1 if arcade has not started yet
  const arcadeStartDate = parseDateInEasternTime(ARCADE_WEEKLY_PLAN[0].missionTimeStart);
  if (currentDate.isBefore(arcadeStartDate)) {
    return -1;
  }

  // return >7 if arcade has ended
  const lastArcadeWeek = ARCADE_WEEKLY_PLAN[ARCADE_WEEKLY_PLAN.length - 1];
  if (
    lastArcadeWeek &&
    currentDate.isAfter(
      parseDateInEasternTime(
        lastArcadeWeek.missionTimeEnd, // end of last mission
      ),
    )
  ) {
    return ARCADE_WEEKLY_PLAN.length;
  }

  // else, find out which week is going
  let currentWeekIndex = 0;
  ARCADE_WEEKLY_PLAN.forEach((weeklyPlan, index) => {
    const startDate = parseDateInEasternTime(weeklyPlan.missionTimeStart);

    // if the current date is after the start-date of the mission-week, update it to be the current week
    if (currentDate.isAfter(startDate)) {
      currentWeekIndex = index;
    }
  });
  return currentWeekIndex;
};

export default function ArcadePage(params: OptionalArcadePageParams) {
  const currentWeekIndex = getCurrentWeekIndex(Number(params.searchParams.arcadeWeekIndex));

  const isBeforeArcade = currentWeekIndex < 0;
  const isDuringArcade = currentWeekIndex >= 0 && currentWeekIndex < ARCADE_WEEKLY_PLAN.length;
  const isAfterArcade = currentWeekIndex >= ARCADE_WEEKLY_PLAN.length;

  return (
    <div className="relative mx-auto flex w-full max-w-[1000px] flex-col gap-[80px] lg:gap-[150px]">
      <div className="flex flex-col gap-[50px]">
        {/* Banner Image */}
        <Card className="relative top-0 flex w-full flex-col justify-end bg-black bg-[url('/images/arcade-background.webp')] bg-cover bg-right-bottom bg-no-repeat p-[45px] lg:h-[350px]">
          <div className="z-10 mx-auto w-full max-w-[700px]">Arbitrum Arcade</div>
          {currentWeekIndex < ARCADE_WEEKLY_PLAN.length ? (
            <>
              {/* Arcade in progress */}
              <div className="z-10 my-8 text-2xl text-white/50 lg:text-4xl">
                <p className="text-white">Welcome to the Arbitrum Arcade! </p>An 9-week onchain
                gameathon designed to highlight the most innovative gaming experiences in web3.
              </div>
            </>
          ) : (
            <>
              {/* Arcade ended */}
              <div className="z-10 my-8 text-2xl text-white/50 lg:text-4xl">
                <span className="text-white">The Arbitrum Arcade has ended.</span>
                <br />
                You can continue to explore the Arbitrum side missions.
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Timeline */}
      {!isAfterArcade && (
        <>
          {/* Timeline */}
          <ArcadeTimeline currentWeekIndex={currentWeekIndex} />

          {/* Missions */}
          <div className="flex flex-col gap-4 lg:mt-[-100px]">
            {isBeforeArcade && <ArcadeBeforeMissions />}

            {isDuringArcade && <ArcadeCurrentMissions currentWeekIndex={currentWeekIndex} />}
          </div>

          <hr />
        </>
      )}

      {/* Side missions */}
      <MissionsList />

      {/* FAQs */}
      <div className="relative z-10 flex flex-col gap-6">
        <MissionsFAQs />
      </div>
    </div>
  );
}
