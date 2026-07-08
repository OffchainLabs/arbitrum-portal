/**
 * Pure chain-filter selection predicates, kept free of any network/provider
 * imports so they stay unit-testable (importing `util/networks` pulls in the
 * token-bridge-sdk chain, which the test runner can't resolve).
 */

/**
 * The user's explicit filter selection, tagged with the testnet mode it was
 * made in. `chainIds: []` means an explicit "All Chains" (no filtering).
 */
export type TxHistoryChainSelection = {
  chainIds: number[];
  isTestnetMode: boolean;
};

/**
 * Resolves the effective chain selection. `null` means the user hasn't touched
 * the filter, so it follows the bridge default (the selected pair's child
 * chain). A selection made in the other testnet mode also falls back to the
 * default — its chains don't exist in the current mode — which re-defaults the
 * filter whenever the user switches between testnet and mainnet.
 */
export function resolveSelectedChainIds({
  selection,
  isTestnetMode,
  defaultChainIds,
}: {
  selection: TxHistoryChainSelection | null;
  isTestnetMode: boolean;
  defaultChainIds: number[];
}): number[] {
  if (selection === null || selection.isTestnetMode !== isTestnetMode) {
    return defaultChainIds;
  }
  return selection.chainIds;
}

// An empty selection means "All Chains" (no filtering).
export function isChainFilterActive(selectedChainIds: number[]): boolean {
  return selectedChainIds.length > 0;
}

/**
 * Whether a transaction (or route) belongs to the selected chain set. A tx is
 * kept when it touches a selected chain on either endpoint, so selecting a chain
 * shows every route to and from it. When nothing is selected, everything passes.
 */
export function matchesChainFilter({
  selectedChainIds,
  sourceChainId,
  destinationChainId,
}: {
  selectedChainIds: number[];
  sourceChainId: number;
  destinationChainId: number;
}): boolean {
  if (!isChainFilterActive(selectedChainIds)) {
    return true;
  }

  return selectedChainIds.includes(sourceChainId) || selectedChainIds.includes(destinationChainId);
}
