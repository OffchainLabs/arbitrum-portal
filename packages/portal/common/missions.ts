import { dayjs, getCurrentDateInEasternTime } from '@/common/dateUtils';
import { EcosystemMission } from './types';
import { PORTAL_DATA_ENDPOINT } from './constants';

// Parse and filter out the missions that are outside the time range
// this check is kept here (and not in generate.ts) so that the expired projects are filtered out in real-time rather than needing to re-generate content again
export const getMissions = async (): Promise<EcosystemMission[]> => {
  const missionsJson = await fetch(
    `${PORTAL_DATA_ENDPOINT}/__auto-generated-ecosystem-missions.json`,
  ).then((res) => res.json());
  return missionsJson.content.filter((mission: EcosystemMission) => {
    if (!mission.startDate || !mission.endDate) return true; // if no time-frame present, ignore the date filter

    const currentDate = getCurrentDateInEasternTime();
    const startDate = dayjs(mission.startDate, 'YYYY-MM-DD');
    const endDate = dayjs(mission.endDate, 'YYYY-MM-DD');
    return currentDate.isAfter(startDate) && currentDate.isBefore(endDate);
  });
};
