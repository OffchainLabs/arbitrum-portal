'use client';

import { ReactNode } from 'react';

import { Button } from '@/bridge/components/common/Button';

import { EarnActionPanelInput } from '../EarnActionPanelInput';

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
  inputTokenSelector?: ReactNode;
  currentBalance: string;
  currentUsdValue?: number;
  isAmountExceedsBalance: boolean;
  isConnected?: boolean;
  validationError?: string | null;
  decimals?: number; // Token decimals for input validation
}

export function EarnAmountInputSection({
  amount,
  onAmountChange,
  onMaxClick,
  label,
  inputToken,
  inputTokenSelector,
  currentBalance,
  currentUsdValue,
  isAmountExceedsBalance,
  isConnected = false,
  validationError,
  decimals = 18, // Default to 18 decimals if not provided
}: EarnAmountInputSectionProps) {
  return (
    <div className="bg-neutral-100 rounded-lg flex flex-col p-4">
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
            decimals={decimals}
          />
          {inputTokenSelector || (
            <div className="bg-[#333333] rounded-lg flex gap-1 items-center px-2.5 py-[5px]">
              {inputToken.logoUrl ? (
                // disable Next image optimization because image is dynamic
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={inputToken.logoUrl}
                  alt={`${inputToken.symbol} logo`}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-600" />
              )}
              <span className="text-sm font-medium text-white">{inputToken.symbol}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-white/50">
          <span>
            {(() => {
              const amt = parseFloat(amount || '0');
              if (!amt || !isFinite(amt)) return '$0.00 USD';
              const perUnitUsd =
                currentBalance && parseFloat(currentBalance) > 0 && currentUsdValue
                  ? currentUsdValue / parseFloat(currentBalance)
                  : 0;
              return `$${(amt * perUnitUsd).toFixed(2)} USD`;
            })()}
          </span>
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
