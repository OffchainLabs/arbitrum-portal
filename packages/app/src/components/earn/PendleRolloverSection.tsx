'use client';

import { twMerge } from 'tailwind-merge';

import { getPendleRolloverLabel } from '@/app-hooks/earn/pendlePanelUtils';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { formatPercentage } from '@/bridge/util/NumberUtils';
import type { RolloverTarget } from '@/earn-api/types';

interface PendleRolloverSectionProps {
  targets: RolloverTarget[];
  selectedTargetId: string | null;
  onSelect: (targetId: string) => void;
}

export function PendleRolloverSection({
  targets,
  selectedTargetId,
  onSelect,
}: PendleRolloverSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm text-white/50">Rollover to New Markets:</span>
      {targets.map((target) => {
        const isSelected = target.id === selectedTargetId;
        return (
          <button
            key={target.id}
            type="button"
            onClick={() => onSelect(target.id)}
            className={twMerge(
              'w-full rounded-xl border p-4 text-left transition-colors',
              isSelected ? 'border-earn-lend/50 bg-earn-lend/10' : 'border-white/10 bg-neutral-100',
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                  <SafeImage
                    src={target.ptTokenIcon || ''}
                    alt={target.name || `PT${target.tokenSymbol}`}
                    className="h-12 w-12 rounded-full"
                    fallback={<div className="h-12 w-12 rounded-full bg-blue-600" />}
                  />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-medium uppercase text-white">
                    {`PT${target.tokenSymbol}`}
                  </div>
                  <div className="text-xs uppercase tracking-[0.24px] text-white/50">
                    {getPendleRolloverLabel(target.expiry)}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-base font-medium text-white">
                  {target.impliedApy != null ? formatPercentage(target.impliedApy) : '—'}
                </div>
                <div className="text-xs text-white/50">Fixed APY</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
