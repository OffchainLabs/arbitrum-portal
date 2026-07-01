import dayjs from 'dayjs';

export const normalizeTimestamp = (date: number | string) => {
  // because we get timestamps in different formats from subgraph/event-logs/useTxn hook, we need 1 standard format.
  const TIMESTAMP_LENGTH = 13;
  let timestamp = date;

  if (typeof date === 'string') {
    timestamp = isNaN(Number(date))
      ? dayjs(new Date(date)).unix() // for ISOstring type of dates -> dayjs timestamp
      : Number(date); // for timestamp type of date -> dayjs timestamp
  }

  const timestampString = String(timestamp);

  if (timestampString.length === TIMESTAMP_LENGTH) {
    // correct timestamp length
    return Number(timestampString);
  }

  if (timestampString.length < TIMESTAMP_LENGTH) {
    // add zeros at the end until correct timestamp length
    return Number(timestampString.padEnd(TIMESTAMP_LENGTH, '0'));
  }

  // remove end digits until correct timestamp length
  return Number(timestampString.slice(0, TIMESTAMP_LENGTH));
};
