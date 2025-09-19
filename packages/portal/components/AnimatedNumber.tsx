'use client';

import CountUp from 'react-countup';

export const AnimatedNumber = ({ number }: { number: number }) => {
  return <CountUp end={number} />;
};
