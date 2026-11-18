import { ChainPair } from '../txHistoryRoutes';

/** One chain pair's history fetch. A failed fetch has no transfers. */
export type ChainPairFetch<T> = { chainPair: ChainPair; transfers: T[]; failed: boolean };

/** The pairs with a failed fetch, each listed once. */
export function getFailedChainPairs(fetches: ChainPairFetch<unknown>[]): ChainPair[] {
  return fetches.reduce<ChainPair[]>(
    (pairs, { chainPair, failed }) =>
      !failed ||
      pairs.some(
        (pair) =>
          pair.parentChainId === chainPair.parentChainId &&
          pair.childChainId === chainPair.childChainId,
      )
        ? pairs
        : [...pairs, chainPair],
    [],
  );
}
