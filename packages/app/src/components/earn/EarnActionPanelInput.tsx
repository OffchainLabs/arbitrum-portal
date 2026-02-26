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
  'decimals': number;
}

export function EarnActionPanelInput({
  id,
  name,
  'aria-label': ariaLabel,
  value,
  onChange,
  decimals,
}: EarnActionPanelInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const sanitizedValue = sanitizeAmountQueryParam(truncateExtraDecimals(inputValue, decimals));
    onChange(sanitizedValue);
  };

  return (
    <input
      id={id}
      name={name}
      aria-label={ariaLabel}
      type="text"
      inputMode="decimal"
      placeholder="0"
      value={value}
      onChange={handleChange}
      className="flex-1 bg-transparent w-full text-[28px] font-normal text-white leading-[1.15] tracking-[-0.56px] placeholder-gray-400 focus:outline-none outline-none h-[34px]"
    />
  );
}
