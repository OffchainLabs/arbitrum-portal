'use client';

import type { ReactNode } from 'react';

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
  isAmountExceedsBalance,
  isConnected = false,
  validationError,
  inputTokenSelector,
}: EarnAmountInputSectionProps) {
  const amountNumber = Number(amount);
  const currentBalanceNumeric =
    typeof currentBalanceAmount === 'number' && Number.isFinite(currentBalanceAmount)
      ? currentBalanceAmount
      : 0;
  const perUnitUsd =
    currentBalanceNumeric > 0 && currentUsdValue != null
      ? currentUsdValue / currentBalanceNumeric
      : null;
  const currentInputUsdValue =
    perUnitUsd != null
      ? Math.max(0, Number.isFinite(amountNumber) ? amountNumber : 0) * perUnitUsd
      : null;

  return (
    <div className="bg-neutral-100 rounded flex flex-col p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">{label}</span>
          <Button
            variant="secondary"
            onClick={onMaxClick}
            className="px-2.5 py-0 h-4 text-[10px] rounded-md bg-white/10 border-0"
          >
            MAX
          </Button>
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
