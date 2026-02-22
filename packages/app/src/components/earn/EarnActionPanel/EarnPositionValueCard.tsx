export interface PositionValue {
  amount: string;
  usdValue?: string;
  label?: string;
  status?: string;
}

interface EarnPositionValueCardProps {
  positionValue: PositionValue;
}

export function EarnPositionValueCard({ positionValue }: EarnPositionValueCardProps) {
  return (
    <div className="bg-neutral-100 rounded-lg flex flex-col p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">
            {positionValue.label || 'Position Value'}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-[28px] font-normal text-white/70 leading-[1.15] tracking-[-0.56px]">
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
