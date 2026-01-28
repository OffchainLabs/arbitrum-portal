import Image from 'next/image';
import { twMerge } from 'tailwind-merge';

export function LiveIncentivesBadge({ className }: { className?: string }) {
  return (
    <div
      className={twMerge(
        'flex items-center gap-1 rounded-sm bg-live-incentives-gradient px-1.5 py-0.5 text-xs font-semibold z-10',
        className,
      )}
    >
      <Image
        src="/icons/liveIncentives.svg"
        alt="Live Incentives"
        width={12}
        height={12}
        className="saturate-0 invert"
      />
      <span className="text-black">Incentive</span>
    </div>
  );
}
