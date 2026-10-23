import { EarnTokenBadge } from '../EarnTokenSelector';
import type { TokenDisplay } from './EarnAmountInputSection';

interface EarnReceiveAmountSectionProps {
  label: string;
  amount: string | null;
  isLoading?: boolean;
  token: TokenDisplay;
  tokenSelector?: React.ReactNode;
  usdValue?: string;
  outputBalance?: string;
}

export function EarnReceiveAmountSection({
  label,
  amount,
  isLoading,
  token,
  tokenSelector,
  usdValue,
  outputBalance,
}: EarnReceiveAmountSectionProps) {
  return (
    <div className="flex flex-col rounded bg-neutral-100 p-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-white/50">{label}</span>
        <div className="flex items-center justify-between gap-2">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400/30 border-t-gray-400" />
              <span className="text-sm text-gray-400">Loading quote...</span>
            </div>
          ) : amount === null ? (
            <span className="text-sm text-gray-400">No quote found</span>
          ) : (
            <input
              type="text"
              value={amount || '0.00'}
              readOnly
              className="h-[34px] w-full flex-1 bg-transparent text-[28px] leading-[1.15] font-normal tracking-[-0.56px] text-white placeholder-gray-400 focus:outline-hidden"
            />
          )}
          {tokenSelector ?? <EarnTokenBadge symbol={token.symbol} logoUrl={token.logoUrl} />}
        </div>
        {(usdValue || outputBalance) && (
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>{usdValue || ''}</span>
            {outputBalance ? <span>{outputBalance}</span> : null}
          </div>
        )}
      </div>
    </div>
  );
}
