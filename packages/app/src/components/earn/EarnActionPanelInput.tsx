'use client';

import { ChangeEvent } from 'react';

import { sanitizeAmountQueryParam } from '@/bridge/hooks/useArbQueryParams';

interface EarnActionPanelInputProps {
  'id'?: string;
  'name'?: string;
  'aria-label'?: string;
  'value': string;
  'onChange': (value: string) => void;
}

export function EarnActionPanelInput({
  id,
  name,
  'aria-label': ariaLabel,
  value,
  onChange,
}: EarnActionPanelInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(sanitizeAmountQueryParam(inputValue));
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
      className="h-[34px] w-full flex-1 bg-transparent text-[28px] leading-[1.15] font-normal tracking-[-0.56px] text-white placeholder-gray-400 outline-hidden focus:outline-hidden focus-visible:outline-hidden!"
    />
  );
}
