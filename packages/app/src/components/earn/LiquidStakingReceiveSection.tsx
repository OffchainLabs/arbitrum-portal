'use client';

import {
  EarnTokenBadge,
  TokenSelectorControl,
  type TokenSelectorControlConfig,
} from './EarnTokenSelector';

interface LiquidStakingReceiveSectionProps {
  label: string;
  amount: string | null;
  isLoading?: boolean;
  token: {
    symbol: string;
    logoUrl?: string;
  };
  tokenControl?: TokenSelectorControlConfig;
  usdValue?: string;
}

export function LiquidStakingReceiveSection({
  label,
  amount,
  isLoading,
  token,
  tokenControl,
  usdValue,
}: LiquidStakingReceiveSectionProps) {
  return (
    <div className="bg-neutral-100 rounded flex flex-col p-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-white/50">{label}</span>
        <div className="flex items-center justify-between gap-2">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
              <span className="text-gray-400 text-sm">Loading quote...</span>
            </div>
          ) : amount === null ? (
            <span className="text-gray-400 text-sm">No quote found</span>
          ) : (
            <input
              type="text"
              value={amount || '0.00'}
              readOnly
              className="flex-1 bg-transparent w-full text-[28px] font-normal text-white leading-[1.15] tracking-[-0.56px] placeholder-gray-400 focus:outline-none h-[34px]"
            />
          )}
          {tokenControl ? (
            <TokenSelectorControl control={tokenControl} />
          ) : (
            <EarnTokenBadge symbol={token.symbol} logoUrl={token.logoUrl} />
          )}
        </div>
        {usdValue && (
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>{usdValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}
