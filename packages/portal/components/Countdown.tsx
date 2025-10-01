'use client';

import ReactCountdown from 'react-countdown';

import { ArcadeChallengeUnlockButton } from './Arcade/ArcadeChallengeUnlockButton';

// Renderer callback with condition
const renderer = ({
  days,
  hours,
  minutes,
  seconds,
  completed,
}: {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  completed: boolean;
}) => {
  if (completed) return <ArcadeChallengeUnlockButton />;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        {days <= 9 ? `0${days}` : days}
        <span className="text-sm opacity-50">days</span>
      </div>
      :
      <div className="flex flex-col items-center">
        {hours <= 9 ? `0${hours}` : hours}
        <span className="text-sm opacity-50">hours</span>
      </div>
      :
      <div className="flex flex-col items-center">
        {minutes <= 9 ? `0${minutes}` : minutes}
        <span className="text-sm opacity-50">mins</span>
      </div>
      :
      <div className="flex flex-col items-center">
        {seconds <= 9 ? `0${seconds}` : seconds}
        <span className="text-sm opacity-50">seconds</span>
      </div>
    </div>
  );
};

export default function Countdown({ toDate }: { toDate: string | number }) {
  return <ReactCountdown date={toDate} renderer={renderer} />;
}
