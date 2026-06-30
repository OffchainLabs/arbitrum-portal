import { create } from 'zustand';

type TransactionHistoryChainFilterStore = {
  // The chain IDs the user wants to view transactions for.
  // An empty array means "All chains" and reverts to the default (unfiltered) behavior.
  selectedChainIds: number[];
  // Whether the user has explicitly changed the filter. Until they do, the filter
  // tracks the chains selected in the bridge (the URL query selector).
  hasUserModified: boolean;
  setSelectedChainIds: (chainIds: number[]) => void;
  toggleChainId: (chainId: number) => void;
  // Resets to "All chains".
  clearSelectedChainIds: () => void;
  // Sets the default selection from the bridge's selected chains. No-op once the
  // user has interacted with the filter, so we never override an explicit choice.
  initializeFromBridgeChains: (chainIds: number[]) => void;
};

export const useTransactionHistoryChainFilterStore = create<TransactionHistoryChainFilterStore>(
  (set) => ({
    selectedChainIds: [],
    hasUserModified: false,
    setSelectedChainIds: (chainIds: number[]) =>
      set({ selectedChainIds: chainIds, hasUserModified: true }),
    toggleChainId: (chainId: number) =>
      set((state) => ({
        hasUserModified: true,
        selectedChainIds: state.selectedChainIds.includes(chainId)
          ? state.selectedChainIds.filter((id) => id !== chainId)
          : [...state.selectedChainIds, chainId],
      })),
    clearSelectedChainIds: () => set({ selectedChainIds: [], hasUserModified: true }),
    initializeFromBridgeChains: (chainIds: number[]) =>
      set((state) => {
        if (state.hasUserModified) {
          return state;
        }
        // Avoid a redundant state update (and refetch) if nothing changed.
        const isSameSelection =
          state.selectedChainIds.length === chainIds.length &&
          chainIds.every((id) => state.selectedChainIds.includes(id));
        if (isSameSelection) {
          return state;
        }
        return { selectedChainIds: chainIds };
      }),
  }),
);

/**
 * Returns true if the chain filter is active (i.e. the user has narrowed the
 * view to a specific set of chains). When inactive, transaction history fetches
 * for all chains, matching the default behavior.
 */
export function isChainFilterActive(selectedChainIds: number[]) {
  return selectedChainIds.length > 0;
}

/**
 * Whether a transaction belongs to the selected chain set. A transaction is kept
 * if either its source or destination chain is selected. When no chains are
 * selected, every transaction passes.
 */
export function matchesChainFilter({
  selectedChainIds,
  sourceChainId,
  destinationChainId,
}: {
  selectedChainIds: number[];
  sourceChainId: number;
  destinationChainId: number;
}) {
  if (!isChainFilterActive(selectedChainIds)) {
    return true;
  }

  return selectedChainIds.includes(sourceChainId) || selectedChainIds.includes(destinationChainId);
}
