'use client';

import type { ReactNode } from 'react';

import { getEarnInputUsdValue } from '@/app-lib/earn/utils';
import { Button } from '@/bridge/components/common/Button';
import { formatUSD } from '@/bridge/util/NumberUtils';

import { EarnActionPanelInput } from '../EarnActionPanelInput';
import { EarnTokenBadge } from '../EarnTokenSelector';

export interface TokenDisplay {
  symbol: string;
  logoUrl?: string;
}

interface EarnAmountInputSectionProps {
  amount: string;
  onAmountChange: (amount: string) => void;
  onMaxClick: () => void;
  label: string;
  inputToken: TokenDisplay;
  currentBalance: string;
  currentBalanceAmount?: number;
  currentUsdValue?: number;
  tokenPriceUsd?: number | null;
  isAmountExceedsBalance: boolean;
  isConnected?: boolean;
  validationError?: string | null;
  inputTokenSelector?: ReactNode;
}

export function EarnAmountInputSection({
  amount,
  onAmountChange,
  onMaxClick,
  label,
  inputToken,
  currentBalance,
  currentBalanceAmount,
  currentUsdValue,
  tokenPriceUsd,
  isAmountExceedsBalance,
  isConnected = false,
  validationError,
  inputTokenSelector,
}: EarnAmountInputSectionProps) {
  const currentInputUsdValue = getEarnInputUsdValue({
    amount,
    tokenPriceUsd,
    currentBalanceAmount,
    currentUsdValue,
  });

  return (
    <div className="flex flex-col rounded bg-neutral-100 p-4 focus-within:ring-2 focus-within:ring-white/30">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">{label}</span>
          {isConnected && (
            <Button
              variant="secondary"
              onClick={onMaxClick}
              className="h-4 rounded-md border-0 bg-white/10 px-2.5 py-0 text-[10px]"
            >
              MAX
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <EarnActionPanelInput
            id="amount-input"
            name="amount-input"
            aria-label="amount-input"
            value={amount}
            onChange={onAmountChange}
          />
          {inputTokenSelector ?? (
            <EarnTokenBadge symbol={inputToken.symbol} logoUrl={inputToken.logoUrl} />
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-white/50">
          <span>{currentInputUsdValue != null ? `~${formatUSD(currentInputUsdValue)}` : null}</span>
          {isConnected && <span>Balance: {currentBalance}</span>}
        </div>
      </div>
      {isAmountExceedsBalance && isConnected && (
        <div className="mt-2 text-xs text-red-400">
          Insufficient balance. You have {currentBalance} available.
        </div>
      )}
      {!isAmountExceedsBalance && validationError && (
        <div className="mt-2 text-xs text-red-400">{validationError}</div>
      )}
    </div>
  );
}
