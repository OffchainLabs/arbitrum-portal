import { ArcadeWeekPlan } from './ArcadeWeekPlan';
import { ARCADE_WEEKLY_PLAN } from './plans';

export const ArcadeBeforeMissions = () => {
  return <ArcadeWeekPlan arcadeWeek={ARCADE_WEEKLY_PLAN[0]} locked />;
};
