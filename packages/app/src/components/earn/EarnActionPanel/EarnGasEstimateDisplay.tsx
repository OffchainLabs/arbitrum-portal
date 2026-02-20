'use client';

import type { GasEstimate } from '@/app-hooks/earn/useEarnGasEstimate';

interface EarnGasEstimateDisplayProps {
  estimate: GasEstimate | null;
  isLoading: boolean;
  error: Error | null;
  fallback?: string; // Fallback text when no estimate is available
}

export function EarnGasEstimateDisplay({
  estimate,
  isLoading,
  error,
  fallback = '-',
}: EarnGasEstimateDisplayProps) {
  if (isLoading) {
    return <span className="text-xs text-white/40">Loading...</span>;
  }

  if (error) {
    return <span className="text-xs text-white/40">{fallback}</span>;
  }

  if (!estimate) {
    return <span className="text-xs text-white">{fallback}</span>;
  }

  return <span className="text-xs text-white">{estimate.usd ?? `~${estimate.eth} ETH`}</span>;
}
