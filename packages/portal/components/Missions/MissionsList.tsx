import { MISSIONS } from '@/common/missions';

import { MissionCard } from './MissionCard';

export const MissionsList = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-3xl">
        Explore side missions.{' '}
        <span className="opacity-50">
          These are other ongoing missions from teams within the Arbitrum Ecosystem.
        </span>
      </div>

      {MISSIONS.length > 0 && (
        <div className="text-sm">
          The content here is provided by the app developers. Links and content are not verified nor
          endorsed by Arbitrum. If you have any questions, please contact the project directly.
        </div>
      )}

      {!MISSIONS.length && (
        <div className="text-sm text-white/50">
          Looks like there are no active missions currently. Please check again later.
        </div>
      )}

      {/* Missions */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2">
        {MISSIONS.map((mission, index) => {
          return <MissionCard key={`side_mission_${index}`} mission={mission} />;
        })}
      </div>
    </div>
  );
};
