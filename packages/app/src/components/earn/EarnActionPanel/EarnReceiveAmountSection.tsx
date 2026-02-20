'use client';

import Image from 'next/image';
import { ReactNode } from 'react';

export interface TokenDisplay {
  symbol: string;
  logoUrl?: string;
}

interface EarnReceiveAmountSectionProps {
  label: string;
  amount: string | null;
  isLoading?: boolean;
  token: TokenDisplay;
  tokenSelector?: ReactNode;
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
    <div className="bg-neutral-100 rounded-lg flex flex-col p-4">
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
          {tokenSelector || (
            <div className="bg-[#333333] rounded-lg flex gap-2 items-center px-4 py-2">
              {token.logoUrl ? (
                <Image
                  src={token.logoUrl}
                  alt={token.symbol}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-600" />
              )}
              <span className="text-base font-medium text-white">{token.symbol}</span>
            </div>
          )}
        </div>
        {(usdValue || outputBalance) && (
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>{usdValue || '$0.00 USD'}</span>
            {outputBalance && <span>Balance: {outputBalance}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
