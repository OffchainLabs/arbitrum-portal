'use client';

import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { SafeImage } from '@/bridge/components/common/SafeImage';

import type { EarnTokenOption } from './earnTokenDropdownOptions';

const TOKEN_BADGE_CLASS =
  'bg-neutral-200 rounded flex gap-2 items-center px-4 py-2 text-base font-medium text-white';

function TokenBadgeContent({ symbol, logoUrl }: { symbol: string; logoUrl?: string }) {
  return (
    <>
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
    </>
  );
}

interface SelectableTokenBadgeProps {
  symbol: string;
  logoUrl?: string;
  onClick: () => void;
}

function SelectableTokenBadge({ symbol, logoUrl, onClick }: SelectableTokenBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={twMerge(TOKEN_BADGE_CLASS, 'focus:outline-none')}
    >
      <TokenBadgeContent symbol={symbol} logoUrl={logoUrl} />
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

interface EarnTokenSelectorProps {
  options: EarnTokenOption[];
  selected: EarnTokenOption;
  onSelect: (token: EarnTokenOption) => void;
}

export function EarnTokenSelector({ options, selected, onSelect }: EarnTokenSelectorProps) {
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
      <SelectableTokenBadge
        symbol={selected.symbol}
        logoUrl={selected.logoUrl}
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
              className={twMerge(
                'w-full flex gap-2 items-center px-4 py-2 text-base font-medium text-white transition-all',
                selected.symbol === token.symbol
                  ? 'bg-neutral-200 opacity-100'
                  : 'opacity-50 hover:opacity-75',
              )}
            >
              <TokenBadgeContent symbol={token.symbol} logoUrl={token.logoUrl} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface EarnTokenBadgeProps {
  symbol: string;
  logoUrl?: string;
}

export function EarnTokenBadge({ symbol, logoUrl }: EarnTokenBadgeProps) {
  return (
    <div className={TOKEN_BADGE_CLASS}>
      <TokenBadgeContent symbol={symbol} logoUrl={logoUrl} />
    </div>
  );
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
      <EarnTokenSelector
        options={control.options}
        selected={control.selected}
        onSelect={control.onSelect}
      />
    );
  }

  return <EarnTokenBadge symbol={control.symbol} logoUrl={control.logoUrl} />;
}
