import { useEffect, useMemo } from 'react';

export interface ActionTab {
  id: string;
  label: string;
}

interface UseEarnActionTabsParams {
  primaryAction: { id: string; label: string };
  secondaryAction?: { id: string; label: string };
  hasSecondaryAction: boolean;
  selectedAction: string;
  setSelectedAction: (action: string) => void;
}

/**
 * Hook to manage action tabs for earn action panels
 * Handles building tabs array and ensuring selected action is valid
 */
export function useEarnActionTabs({
  primaryAction,
  secondaryAction,
  hasSecondaryAction,
  selectedAction,
  setSelectedAction,
}: UseEarnActionTabsParams): ActionTab[] {
  const actionTabs = useMemo(() => {
    const tabs: ActionTab[] = [primaryAction];
    if (hasSecondaryAction && secondaryAction) {
      tabs.push(secondaryAction);
    }
    return tabs;
  }, [primaryAction, secondaryAction, hasSecondaryAction]);

  // Ensure selectedAction is valid - switch to first available tab if current is invalid
  useEffect(() => {
    const availableTabIds = actionTabs.map((tab) => tab.id);
    if (availableTabIds.length > 0 && !availableTabIds.includes(selectedAction)) {
      const firstTabId = availableTabIds[0];
      if (firstTabId) {
        setSelectedAction(firstTabId);
      }
    }
  }, [actionTabs, selectedAction, setSelectedAction]);

  return actionTabs;
}
