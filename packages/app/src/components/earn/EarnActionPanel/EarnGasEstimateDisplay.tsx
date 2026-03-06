import type { GasEstimate } from '@/app-hooks/earn/useEarnGasEstimate';
import { formatUSD } from '@/bridge/util/NumberUtils';

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

  const usdValue = estimate.usd ? Number(estimate.usd) : null;
  const formattedUsd =
    usdValue != null && Number.isFinite(usdValue)
      ? usdValue > 0 && usdValue < 0.001
        ? '< $0.001 USD'
        : formatUSD(usdValue)
      : null;

  return <span className="text-xs text-white">{formattedUsd ?? `~${estimate.eth} ETH`}</span>;
}
