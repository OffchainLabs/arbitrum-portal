import { twMerge } from 'tailwind-merge';

export interface PositionValue {
  amount: string;
  usdValue?: string;
  label?: string;
  status?: string;
}

interface EarnPositionValueCardProps {
  positionValue: PositionValue;
  className?: string;
}

export function EarnPositionValueCard({ positionValue, className }: EarnPositionValueCardProps) {
  return (
    <div className={twMerge('bg-neutral-100 rounded flex flex-col p-4', className)}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">
            {positionValue.label || 'Position Value'}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-[28px] leading-[1.15] font-normal tracking-[-0.56px] text-white/70">
            {positionValue.amount}
          </div>
          {positionValue.usdValue && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">{positionValue.usdValue}</span>
              {positionValue.status && (
                <span className="text-xs text-white/50">{positionValue.status}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
