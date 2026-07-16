/**
 * Enumerates the transfer routes that the transaction-history view can show
 * history for, across every source (canonical bridge, CCTP, OFT, LiFi). This is
 * history-specific: it is about "which routes have txns to display", not about
 * routing a live transfer (see `getEligibleRoutes` in the transfer panel for
 * that separate concern).
 */
import { lifiDestinationChainIds } from '../app/api/crosschain-transfers/constants';
import { ChainId } from '../types/ChainId';
import { getChains, getChildChainIds, isNetwork } from './networks';

export type ChainPair = { parentChainId: ChainId; childChainId: ChainId };

/**
 * Every canonical-bridge parent -> child pair across all registered chains: the
 * list of chain pairs the transaction-history fetcher queries.
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
const cctpRoutes: ChainPair[] = [
  { parentChainId: ChainId.Ethereum, childChainId: ChainId.ArbitrumOne },
  { parentChainId: ChainId.Sepolia, childChainId: ChainId.ArbitrumSepolia },
];

// OFT (USDT0) transfers run between the chains that have USDT adapters in
// token-bridge-sdk/oftUtils.ts `oftProtocolConfig` — Ethereum and Arbitrum One.
const oftRoutes: ChainPair[] = [
  { parentChainId: ChainId.Ethereum, childChainId: ChainId.ArbitrumOne },
];

// LiFi cross-chain routes, from the static source -> destinations adjacency map.
function getLifiTxHistoryRoutes(): ChainPair[] {
  return Object.entries(lifiDestinationChainIds).flatMap(([sourceChainId, destinationChainIds]) =>
    destinationChainIds.map((destinationChainId) => ({
      parentChainId: Number(sourceChainId) as ChainId,
      childChainId: destinationChainId as ChainId,
    })),
  );
}

// Undirected key so A<>B and B<>A dedupe to one route.
function getRouteKey(chainIdA: number, chainIdB: number): string {
  return chainIdA < chainIdB ? `${chainIdA}-${chainIdB}` : `${chainIdB}-${chainIdA}`;
}

/**
 * Every transfer route the app can show transaction history for in the given
 * network mode — canonical bridge, CCTP, OFT and LiFi — deduplicated to
 * undirected pairs.
 */
export function getTxHistoryRoutes({ isTestnetMode }: { isTestnetMode: boolean }): ChainPair[] {
  const seen = new Set<string>();
  const routes: ChainPair[] = [];

  for (const route of [
    ...getMultiChainFetchList(),
    ...cctpRoutes,
    ...oftRoutes,
    ...getLifiTxHistoryRoutes(),
  ]) {
    if (isNetwork(route.parentChainId).isTestnet !== isTestnetMode) {
      continue;
    }
    const key = getRouteKey(route.parentChainId, route.childChainId);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    routes.push(route);
  }

  return routes;
}
