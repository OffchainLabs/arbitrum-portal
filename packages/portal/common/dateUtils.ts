import dayjs from 'dayjs';
import advanced from 'dayjs/plugin/advancedFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advanced);

const EASTERN_TIMEZONE = 'America/New_York';
export const DISPLAY_DATETIME_FORMAT = 'MMMM DD, hh:mm A z';
export const DISPLAY_DATETIME_FORMAT_WITH_YEAR = 'MMMM DD YYYY, hh:mm A z';

export const getCurrentDateInEasternTime = () => {
  return dayjs.utc().tz(EASTERN_TIMEZONE);
};

/** given the date in Eastern time (eg. for Arcade/Missions), parse it into dayjs format */
export const parseDateInEasternTime = (date: string) => {
  return dayjs(date).tz(EASTERN_TIMEZONE, true);
};

export const formatDate = (date: string, formatOverride?: string) => {
  // if format is provided, use it
  if (formatOverride) {
    return parseDateInEasternTime(date).format(formatOverride);
  }

  // if the year is not the current year, show the year
  if (dayjs(date).year() !== new Date().getFullYear()) {
    return parseDateInEasternTime(date).format(DISPLAY_DATETIME_FORMAT_WITH_YEAR);
  }

  // else, show the date without the year
  return parseDateInEasternTime(date).format(DISPLAY_DATETIME_FORMAT);
};

export const formatOptionalDate = (date: string | null, formatOverride?: string) => {
  if (!date) return null;
  return formatDate(date, formatOverride);
};

/** export the timezone extended `dayjs` and use that instead of re-initializing in components */
export { dayjs };
