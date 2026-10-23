'use client';

import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

import { formatCompactNumber } from '@/bridge/util/NumberUtils';
import { Card } from '@/components/Card';

interface PendleCapWarningProps {
  currentSupply: number;
  supplyCap: number;
  isCapReached: boolean;
  remainingCap: number | null;
  underlyingAssetSymbol: string;
}

export function PendleCapWarning({
  currentSupply,
  supplyCap,
  isCapReached,
  remainingCap,
  underlyingAssetSymbol,
}: PendleCapWarningProps) {
  const capPercentage = supplyCap > 0 ? (currentSupply / supplyCap) * 100 : 100;
  const isNearCap = capPercentage >= 90 && !isCapReached;

  if (isCapReached) {
    return (
      <Card className="rounded border border-red-400/50 bg-red-900/20 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-5 w-5 shrink-0">
            <ExclamationTriangleIcon className="h-full w-full text-red-400" />
          </div>
          <div className="flex-1">
            <p className="mb-1 text-sm font-medium text-red-400">Deposit Cap Reached</p>
            <p className="text-xs text-red-300/80">
              This market has reached its deposit cap. New deposits are currently unavailable.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (isNearCap) {
    return (
      <Card className="rounded border border-yellow-400/50 bg-yellow-900/20 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-5 w-5 shrink-0">
            <ExclamationTriangleIcon className="h-full w-full text-yellow-400" />
          </div>
          <div className="flex-1">
            <p className="mb-1 text-sm font-medium text-yellow-400">Deposit Cap Warning</p>
            <p className="text-xs text-yellow-300/80">
              This market is {capPercentage.toFixed(1)}% full. Only{' '}
              {remainingCap !== null ? formatCompactNumber(remainingCap) : 'a limited amount'}{' '}
              {underlyingAssetSymbol} deposits remaining.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded border border-blue-400/50 bg-blue-900/20 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-5 w-5 shrink-0">
          <InformationCircleIcon className="h-full w-full text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="mb-1 text-sm font-medium text-blue-400">Deposit Cap</p>
          <p className="text-xs text-blue-300/80">
            This market has a deposit cap of {formatCompactNumber(supplyCap)}{' '}
            {underlyingAssetSymbol}. Currently {capPercentage.toFixed(1)}% full.
          </p>
        </div>
      </div>
    </Card>
  );
}
