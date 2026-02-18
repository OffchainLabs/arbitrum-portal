'use client';

import { ChangeEvent } from 'react';

import { sanitizeAmountQueryParam } from '@/bridge/hooks/useArbQueryParams';
import { truncateExtraDecimals } from '@/bridge/util/NumberUtils';

interface EarnActionPanelInputProps {
  'id'?: string;
  'name'?: string;
  'aria-label'?: string;
  'value': string;
  'onChange': (value: string) => void;
  'placeholder'?: string;
  'className'?: string;
  'decimals'?: number;
}

export function EarnActionPanelInput({
  id,
  name,
  'aria-label': ariaLabel,
  value,
  onChange,
  placeholder = '0',
  className,
  decimals = 18, // Default to 18 decimals if not provided
}: EarnActionPanelInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Apply the same sanitization logic as TransferPanelMainInput
    // First truncate decimals, then sanitize (removes invalid chars, leading zeros, etc.)
    const sanitizedValue = sanitizeAmountQueryParam(truncateExtraDecimals(inputValue, decimals));
    onChange(sanitizedValue);
  };

  const defaultClassName =
    'flex-1 bg-transparent w-full text-[28px] font-normal text-white leading-[1.15] tracking-[-0.56px] placeholder-gray-400 focus:outline-none outline-none h-[34px]';

  return (
    <input
      id={id}
      name={name}
      aria-label={ariaLabel}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      className={className || defaultClassName}
    />
  );
}
