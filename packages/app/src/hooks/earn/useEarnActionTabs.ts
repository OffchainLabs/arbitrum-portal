'use client';

import { useEffect, useMemo } from 'react';

export interface ActionTab<T extends string = string> {
  id: T;
  label: string;
}

interface UseEarnActionTabsParams<T extends string> {
  primaryAction: { id: T; label: string };
  secondaryAction?: { id: T; label: string };
  hasSecondaryAction: boolean;
  selectedAction: T;
  setSelectedAction: (action: T) => void;
}

export function useEarnActionTabs<T extends string>({
  primaryAction,
  secondaryAction,
  hasSecondaryAction,
  selectedAction,
  setSelectedAction,
}: UseEarnActionTabsParams<T>): ActionTab<T>[] {
  const actionTabs = useMemo(() => {
    const tabs: ActionTab<T>[] = [primaryAction];
    if (hasSecondaryAction && secondaryAction) {
      tabs.push(secondaryAction);
    }
    return tabs;
  }, [primaryAction, secondaryAction, hasSecondaryAction]);

  useEffect(() => {
    const availableTabIds = actionTabs.map((tab) => tab.id);
    if (availableTabIds.length > 0 && !availableTabIds.includes(selectedAction)) {
      const firstTabId = availableTabIds[0] as T | undefined;
      if (firstTabId) {
        setSelectedAction(firstTabId);
      }
    }
  }, [actionTabs, selectedAction, setSelectedAction]);

  return actionTabs;
}
