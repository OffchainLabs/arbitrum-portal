/**
 * Enumerates the transfer routes that the transaction-history view can show
 * history for — across every source (canonical bridge, CCTP, OFT, LiFi) — and
 * narrows them to the chain filter's selection. This is history-specific: it is
 * about "which routes have txns to display", not about routing a live transfer
 * (see `getEligibleRoutes` in the transfer panel for that separate concern).
 */
import { lifiDestinationChainIds } from '../app/api/crosschain-transfers/constants';
import { ChainId } from '../types/ChainId';
import { matchesChainFilter } from './chainFilter';
import { getChains, getChildChainIds, isNetwork } from './networks';

/**
 * A transaction-history route is an (unordered) pair of chains that funds can
 * move between. `parentChainId`/`childChainId` name the endpoints; for display
 * and filtering the pair is treated as undirected (a route "to or from" either
 * chain).
 */
export type TxHistoryRoute = { parentChainId: number; childChainId: number };

export type ChainPair = { parentChainId: ChainId; childChainId: ChainId };

/**
 * Every canonical-bridge parent -> child pair across all registered chains: the
 * list of chain pairs the transaction-history fetcher queries, and the canonical
 * subset of `getAllTxHistoryRoutes`.
 */
export function getMultiChainFetchList(): ChainPair[] {
  return getChains().flatMap((chain) => {
    // We only grab child chains because we don't want duplicates and we need the parent chain
    // Although the type is correct here we default to an empty array for custom networks backwards compatibility
    const childChainIds = getChildChainIds(chain);

    const isParentChain = childChainIds.length > 0;

    if (!isParentChain) {
      return [];
    }

    return childChainIds.map((childChainId) => ({
      parentChainId: chain.chainId,
      childChainId: childChainId,
    }));
  });
}

// CCTP (native USDC) is supported only between Ethereum and Arbitrum One, and
// their testnets. Mirrors `CCTPSupportedChainId` / the `contracts` map in
// token-bridge-sdk/cctp.ts.
const cctpRoutes: TxHistoryRoute[] = [
  { parentChainId: ChainId.Ethereum, childChainId: ChainId.ArbitrumOne },
  { parentChainId: ChainId.Sepolia, childChainId: ChainId.ArbitrumSepolia },
];

// OFT (USDT0) transfers run between the chains that have USDT adapters in
// token-bridge-sdk/oftUtils.ts `oftProtocolConfig` — Ethereum and Arbitrum One.
const oftRoutes: TxHistoryRoute[] = [
  { parentChainId: ChainId.Ethereum, childChainId: ChainId.ArbitrumOne },
];

// LiFi cross-chain routes, from the static source -> destinations adjacency map.
function getLifiTxHistoryRoutes(): TxHistoryRoute[] {
  return Object.entries(lifiDestinationChainIds).flatMap(([sourceChainId, destinationChainIds]) =>
    destinationChainIds.map((destinationChainId) => ({
      parentChainId: Number(sourceChainId),
      childChainId: destinationChainId,
    })),
  );
}

// Undirected key so A<>B and B<>A dedupe to one route.
function getRouteKey(chainIdA: number, chainIdB: number): string {
  return chainIdA < chainIdB ? `${chainIdA}-${chainIdB}` : `${chainIdB}-${chainIdA}`;
}

/**
 * Every transfer route the app can show transaction history for — canonical
 * bridge, CCTP, OFT and LiFi — deduplicated to undirected pairs.
 */
export function getAllTxHistoryRoutes(): TxHistoryRoute[] {
  const seen = new Set<string>();
  const routes: TxHistoryRoute[] = [];

  for (const route of [
    ...getMultiChainFetchList(),
    ...cctpRoutes,
    ...oftRoutes,
    ...getLifiTxHistoryRoutes(),
  ]) {
    const key = getRouteKey(route.parentChainId, route.childChainId);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    routes.push(route);
  }

  return routes;
}

/**
 * The routes eligible for the current selection and network mode; an empty
 * selection yields every route for the mode. Drives both the chain filter's
 * checkbox list and its eligible-routes tooltip.
 */
export function getEligibleTxHistoryRoutes({
  selectedChainIds,
  isTestnetMode,
}: {
  selectedChainIds: number[];
  isTestnetMode: boolean;
}): TxHistoryRoute[] {
  return getAllTxHistoryRoutes()
    .filter((route) => isNetwork(route.parentChainId).isTestnet === isTestnetMode)
    .filter((route) =>
      matchesChainFilter({
        selectedChainIds,
        sourceChainId: route.parentChainId,
        destinationChainId: route.childChainId,
      }),
    );
}
