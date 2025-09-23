import missionsJson from '@/public/__auto-generated-ecosystem-missions.json';
import { dayjs, getCurrentDateInEasternTime } from '@/common/dateUtils';
import { EcosystemMission } from './types';

// Parse and filter out the missions that are outside the time range
// this check is kept here (and not in generate.ts) so that the expired projects are filtered out in real-time rather than needing to re-generate content again
export const MISSIONS: EcosystemMission[] = missionsJson.content.filter(
  (mission: EcosystemMission) => {
    if (!mission.startDate || !mission.endDate) return true; // if no time-frame present, ignore the date filter

    const currentDate = getCurrentDateInEasternTime();
    const startDate = dayjs(mission.startDate, 'YYYY-MM-DD');
    const endDate = dayjs(mission.endDate, 'YYYY-MM-DD');
    return currentDate.isAfter(startDate) && currentDate.isBefore(endDate);
  },
);
