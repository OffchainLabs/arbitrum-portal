/**
 * Pure chain-filter selection predicates, kept free of any network/provider
 * imports so they stay unit-testable (importing `util/networks` pulls in the
 * token-bridge-sdk chain, which the test runner can't resolve).
 */

/**
 * Whether the chain filter is active. An empty selection means "All Chains" —
 * no filtering — matching the default (unfiltered) transaction-history behavior.
 */
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
