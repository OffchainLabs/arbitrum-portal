'use client';

import { twMerge } from 'tailwind-merge';

export interface ActionTab {
  id: string;
  label: string;
}

interface EarnActionTabsProps {
  tabs: ActionTab[];
  selectedAction: string;
  onActionChange: (action: string) => void;
}

export function EarnActionTabs({ tabs, selectedAction, onActionChange }: EarnActionTabsProps) {
  if (!tabs || tabs.length === 0 || tabs.length === 1) return null;

  return (
    <div role="tablist" className="bg-white/5 rounded-lg flex gap-0.5 p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={selectedAction === tab.id}
          onClick={() => onActionChange(tab.id)}
          className={twMerge(
            'flex-1 rounded-lg p-4 py-3 text-xs font-medium text-white transition-all',
            selectedAction === tab.id
              ? 'bg-white/10 shadow-[0px_25px_30px_-20px_rgba(0,0,0,0.1)]'
              : 'bg-white/5 opacity-70',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
