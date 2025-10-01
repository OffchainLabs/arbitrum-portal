import { formatDate } from '@/common/dateUtils';
import { EcosystemMission } from '@/common/types';
import MissionFallbackBanner from '@/public/images/MissionFallbackBanner.webp';

import { Card } from '../Card';

export const MissionCard = ({ mission }: { mission: EcosystemMission }) => {
  return (
    <Card
      cardType="externalLink"
      className="flex flex-col text-white/50"
      href={mission.link}
      showExternalLinkArrow
    >
      <div
        className="mb-6 flex aspect-3/1 min-h-[120px] flex-col justify-center rounded-md bg-black bg-cover bg-top bg-no-repeat p-6 py-12"
        style={{
          backgroundImage: `url(${mission.coverImage ?? MissionFallbackBanner.src})`,
        }}
      />

      <div className="relative inline-block w-full transform overflow-hidden">
        <div className="text-xl text-white">{mission.teamsInvolved.join(', ')}</div>
        <div className="mb-6 text-xl">{mission.title}</div>

        {mission.startDate && mission.endDate ? (
          <div>
            {formatDate(mission.startDate)} - {formatDate(mission.endDate)}
          </div>
        ) : (
          'Ongoing'
        )}
      </div>
    </Card>
  );
};
