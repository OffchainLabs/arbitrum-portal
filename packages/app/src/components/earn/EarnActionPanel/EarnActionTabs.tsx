'use client';

import { twMerge } from 'tailwind-merge';

export interface ActionTab {
  id: string;
  label: string;
  disabled?: boolean;
}

interface EarnActionTabsProps<T extends string> {
  tabs: Array<ActionTab & { id: T }>;
  selectedAction: T;
  onActionChange: (action: T) => void;
}

export function EarnActionTabs<T extends string>({
  tabs,
  selectedAction,
  onActionChange,
}: EarnActionTabsProps<T>) {
  if (!tabs || tabs.length === 0 || tabs.length === 1) return null;

  return (
    <div role="tablist" className="bg-white/5 rounded flex gap-0.5 p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={selectedAction === tab.id}
          onClick={() => {
            if (!tab.disabled) {
              onActionChange(tab.id);
            }
          }}
          disabled={tab.disabled}
          className={twMerge(
            'flex-1 rounded p-4 py-3 text-xs font-medium text-white transition-all',
            selectedAction === tab.id
              ? 'bg-white/10 shadow-[0px_25px_30px_-20px_rgba(0,0,0,0.1)]'
              : 'bg-white/5 opacity-70',
            tab.disabled ? 'cursor-not-allowed opacity-50' : '',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
