/**
 * Pure chain-filter selection predicates, kept free of any network/provider
 * imports so they stay trivially unit-testable (`util/networks` chain data is
 * incomplete in the test environment — runtime-registered chains misreport).
 */

/**
 * The user's explicit filter selection, tagged with the testnet mode it was
 * made in. `chainId: null` means an explicit "All Core Chains" selection.
 */
export type TxHistoryChainSelection = {
  chainId: number | null;
  isTestnetMode: boolean;
};

/**
 * The effective filter, resolved from the selection plus network context.
 *
 * - `all-core`: only routes where both endpoints are core chains. This is the
 *   default view: core chains are expected to be indexed (see the note on
 *   `uiCoreChainIds` in util/networks.ts), keeping RPC scanning off it.
 * - `core-chain`: only that chain's routes with the other core chains, so a
 *   core selection stays fully indexed too.
 * - `longtail-chain`: every route touching that chain — otherwise its
 *   non-canonical routes (e.g. LiFi) would be viewable under no selection.
 *   RPC scanning stays bounded to this one unindexed chain at a time.
 */
export type TxHistoryChainFilter =
  | { type: 'all-core'; coreChainIds: number[] }
  | { type: 'core-chain'; chainId: number; coreChainIds: number[] }
  | { type: 'longtail-chain'; chainId: number };

/**
 * Resolves the effective chain filter. `null` selection means the user hasn't
 * touched the filter, which defaults to "All Core Chains". A selection made in
 * the other testnet mode also falls back to the default — its chains don't
 * exist in the current mode — which re-defaults the filter whenever the user
 * switches between testnet and mainnet.
 */
export function resolveChainFilter({
  selection,
  isTestnetMode,
  coreChainIds,
}: {
  selection: TxHistoryChainSelection | null;
  isTestnetMode: boolean;
  coreChainIds: number[];
}): TxHistoryChainFilter {
  if (
    selection === null ||
    selection.isTestnetMode !== isTestnetMode ||
    selection.chainId === null
  ) {
    return { type: 'all-core', coreChainIds };
  }

  const { chainId } = selection;

  if (coreChainIds.includes(chainId)) {
    return { type: 'core-chain', chainId, coreChainIds };
  }

  return { type: 'longtail-chain', chainId };
}

/**
 * Stable identifier for a filter, used in SWR keys so the history refetches
 * when the effective selection changes. The core set is encoded because the
 * match result depends on it and it differs between network modes: a key that
 * survived a testnet-mode toggle unchanged would pin SWR to a result fetched
 * during the toggle's debounce window, under the other mode's filter.
 */
export function getChainFilterKey(filter: TxHistoryChainFilter): string {
  if (filter.type === 'longtail-chain') {
    return `chain-${filter.chainId}`;
  }
  const coreChainIdsKey = filter.coreChainIds.join('_');
  if (filter.type === 'core-chain') {
    return `chain-${filter.chainId}-core-${coreChainIdsKey}`;
  }
  return `all-core-${coreChainIdsKey}`;
}

/**
 * Whether a transaction (or route) passes the filter. A tx is kept when its
 * endpoints form an allowed route: both core for "All Core Chains", the
 * selected chain with another core chain for a core selection, or any route
 * touching the selected chain for a longtail selection.
 */
export function matchesChainFilter({
  filter,
  sourceChainId,
  destinationChainId,
}: {
  filter: TxHistoryChainFilter;
  sourceChainId: number;
  destinationChainId: number;
}): boolean {
  if (filter.type === 'all-core') {
    return (
      filter.coreChainIds.includes(sourceChainId) &&
      filter.coreChainIds.includes(destinationChainId)
    );
  }

  const touchesSelectedChain =
    sourceChainId === filter.chainId || destinationChainId === filter.chainId;

  if (filter.type === 'longtail-chain') {
    return touchesSelectedChain;
  }

  return (
    touchesSelectedChain &&
    filter.coreChainIds.includes(sourceChainId) &&
    filter.coreChainIds.includes(destinationChainId)
  );
}
