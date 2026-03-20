'use client';

import { Cog6ToothIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCallback, useState } from 'react';

const SLIPPAGE_PRESETS = [0.2, 0.25, 0.5, 1] as const;
const SLIPPAGE_MIN = 0.01;
const SLIPPAGE_MAX = 50;

const isPreset = (n: number) => SLIPPAGE_PRESETS.some((p) => Math.abs(p - n) < 0.001);

export interface SlippageSettingsPanelProps {
  slippagePercent: number;
  onSlippageChange: (value: number) => void;
}

export function SlippageSettingsPanel({
  slippagePercent,
  onSlippageChange,
}: SlippageSettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(slippagePercent);
  const [customInput, setCustomInput] = useState('');

  const openPanel = () => {
    setDraft(slippagePercent);
    setCustomInput(isPreset(slippagePercent) ? '' : String(slippagePercent));
    setOpen(true);
  };

  const closePanel = useCallback(() => {
    setDraft(slippagePercent);
    setOpen(false);
  }, [slippagePercent]);

  const isSlippageValid = Number.isFinite(draft) && draft >= SLIPPAGE_MIN && draft <= SLIPPAGE_MAX;

  const handleUpdate = useCallback(() => {
    if (!isSlippageValid) return;
    onSlippageChange(Number(draft.toFixed(2)));
    closePanel();
  }, [closePanel, draft, isSlippageValid, onSlippageChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setCustomInput(raw);
    if (raw === '' || raw === '.') {
      setDraft(0);
      return;
    }
    const v = parseFloat(raw);
    if (Number.isFinite(v)) setDraft(v);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-650">Slippage:</span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={openPanel} className="text-xs text-white hover:opacity-80">
            {slippagePercent > 0 ? `${slippagePercent}%` : '—'}
          </button>
          {open ? (
            <button
              type="button"
              onClick={closePanel}
              className="p-0.5 text-gray-650 hover:text-white"
              aria-label="Close slippage settings"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={openPanel}
              className="p-0.5 text-gray-650 hover:text-white"
              aria-label="Open slippage settings"
            >
              <Cog6ToothIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {open && (
        <>
          <p className="text-xs text-gray-650">
            Select the maximum amount of slippage you&apos;re willing to accept on this swap.
          </p>
          <div className="grid grid-cols-6 gap-2">
            {SLIPPAGE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setDraft(p);
                  setCustomInput('');
                }}
                className={`rounded border px-3 py-2 text-center flex items-center justify-center text-xs font-medium ${
                  isPreset(draft) && draft === p
                    ? 'border-white bg-neutral-200 text-white'
                    : 'border-neutral-200 bg-neutral-50 text-white hover:border-neutral-250'
                }`}
              >
                {p}%
              </button>
            ))}
            <div
              className={`col-span-2 flex items-center gap-2 rounded border bg-neutral-50 px-3 py-2 ${
                !isSlippageValid
                  ? 'border-red-500 focus-within:border-red-500'
                  : 'border-neutral-200 focus-within:border-neutral-250'
              }`}
            >
              <input
                type="number"
                inputMode="decimal"
                min={SLIPPAGE_MIN}
                max={SLIPPAGE_MAX}
                step={0.1}
                value={isPreset(draft) ? '' : customInput}
                onChange={handleInputChange}
                placeholder="Custom"
                className="w-full min-w-0 border-none bg-transparent text-xs text-white placeholder:text-gray-650 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-xs text-gray-650">%</span>
            </div>
          </div>
          {!isSlippageValid && (
            <p className="text-xs text-red-500">
              Enter a value between {SLIPPAGE_MIN}% and {SLIPPAGE_MAX}%.
            </p>
          )}
          <button
            type="button"
            onClick={handleUpdate}
            disabled={!isSlippageValid}
            className="w-full rounded bg-white py-2.5 text-sm font-medium text-black hover:bg-gray-2 disabled:cursor-not-allowed disabled:bg-gray-650 disabled:opacity-50 disabled:hover:bg-gray-650 disabled:hover:opacity-50"
          >
            Update
          </button>
        </>
      )}
    </div>
  );
}
