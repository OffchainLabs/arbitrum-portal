'use client';

import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { SafeImage } from '@/bridge/components/common/SafeImage';

import type { EarnTokenOption } from './earnTokenDropdownOptions';

interface LiquidStakingTokenBadgeProps {
  symbol: string;
  logoUrl?: string;
  showDropdown?: boolean;
  onClick?: () => void;
}

function LiquidStakingTokenBadge({
  symbol,
  logoUrl,
  showDropdown = false,
  onClick,
}: LiquidStakingTokenBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-neutral-200 rounded flex gap-2 items-center px-4 py-2 text-base font-medium text-white border border-neutral-200 focus:outline-none"
    >
      <div className="relative rounded-full overflow-hidden w-5 h-5">
        <SafeImage
          src={logoUrl}
          alt={`${symbol} logo`}
          className={twMerge('rounded-full', 'w-5 h-5')}
          fallback={
            <div className="w-full h-full bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">
              {symbol[0]}
            </div>
          }
        />
      </div>
      <span>{symbol}</span>
      {showDropdown && (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  );
}

interface LiquidStakingTokenSelectorProps {
  options: EarnTokenOption[];
  selected: EarnTokenOption;
  onSelect: (token: EarnTokenOption) => void;
}

export function LiquidStakingTokenSelector({
  options,
  selected,
  onSelect,
}: LiquidStakingTokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-token-selector]')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" data-token-selector>
      <LiquidStakingTokenBadge
        symbol={selected.symbol}
        logoUrl={selected.logoUrl}
        showDropdown
        onClick={() => setIsOpen((open) => !open)}
      />
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-neutral-100 border border-neutral-200 rounded-lg overflow-hidden z-50 min-w-[200px]">
          {options.map((token) => (
            <button
              key={token.symbol}
              type="button"
              onClick={() => {
                onSelect(token);
                setIsOpen(false);
              }}
              className={`w-full flex gap-2 items-center px-4 py-2 text-base font-medium text-white transition-all ${
                selected.symbol === token.symbol
                  ? 'bg-neutral-200 opacity-100'
                  : 'opacity-50 hover:opacity-75'
              }`}
            >
              <div className="relative rounded-full overflow-hidden w-5 h-5">
                <SafeImage
                  src={token.logoUrl}
                  alt={`${token.symbol} logo`}
                  className={twMerge('rounded-full', 'w-5 h-5')}
                  fallback={
                    <div className="w-full h-full bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">
                      {token.symbol[0]}
                    </div>
                  }
                />
              </div>
              <span>{token.symbol}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface StaticLiquidStakingTokenBadgeProps {
  symbol: string;
  logoUrl?: string;
}

export function StaticLiquidStakingTokenBadge({
  symbol,
  logoUrl,
}: StaticLiquidStakingTokenBadgeProps) {
  return <LiquidStakingTokenBadge symbol={symbol} logoUrl={logoUrl} />;
}

export type TokenSelectorControlConfig =
  | {
      type: 'select';
      options: EarnTokenOption[];
      selected: EarnTokenOption;
      onSelect: (token: EarnTokenOption) => void;
    }
  | {
      type: 'static';
      symbol: string;
      logoUrl?: string;
    };

export function TokenSelectorControl({ control }: { control: TokenSelectorControlConfig }) {
  if (control.type === 'select') {
    return (
      <LiquidStakingTokenSelector
        options={control.options}
        selected={control.selected}
        onSelect={control.onSelect}
      />
    );
  }

  return <StaticLiquidStakingTokenBadge symbol={control.symbol} logoUrl={control.logoUrl} />;
}
