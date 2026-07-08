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

// Canonical bridge routes: every parent -> child pair across all registered chains.
function getCanonicalTxHistoryRoutes(): TxHistoryRoute[] {
  return getChains().flatMap((chain) =>
    getChildChainIds(chain).map((childChainId) => ({
      parentChainId: chain.chainId,
      childChainId,
    })),
  );
}

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
 * Every transfer route the app can show transaction history for, across all
 * sources — canonical bridge, CCTP, OFT and LiFi — deduplicated to undirected
 * pairs. Single source of truth for "which routes exist", used by the chain
 * filter's eligible-routes tooltip.
 */
export function getAllTxHistoryRoutes(): TxHistoryRoute[] {
  const seen = new Set<string>();
  const routes: TxHistoryRoute[] = [];

  for (const route of [
    ...getCanonicalTxHistoryRoutes(),
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
 * All transfer routes that involve the given chain on either endpoint, i.e.
 * every route to or from that chain across all transfer types.
 */
export function getTxHistoryRoutesForChain(chainId: number): TxHistoryRoute[] {
  return getAllTxHistoryRoutes().filter(
    (route) => route.parentChainId === chainId || route.childChainId === chainId,
  );
}

/**
 * The transfer routes eligible for the current selection and network mode: every
 * route (canonical, CCTP, OFT, LiFi) for the given testnet/mainnet mode, narrowed
 * to those the selection matches. Passing an empty selection yields every route
 * for the mode. This is the shared source of truth for the chain filter's
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
