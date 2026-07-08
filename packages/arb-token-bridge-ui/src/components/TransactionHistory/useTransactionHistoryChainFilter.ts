import { useDebounce } from '@uidotdev/usehooks';
import { useMemo } from 'react';

import { useArbQueryParams } from '../../hooks/useArbQueryParams';
import { useIsTestnetMode } from '../../hooks/useIsTestnetMode';
import { useNetworks } from '../../hooks/useNetworks';
import { resolveSelectedChainIds } from '../../util/chainFilter';
import { getNetworksRelationship } from '../../util/getNetworksRelationship';
import { useTransactionHistoryChainFilterStore } from './useTransactionHistoryChainFilterStore';

/**
 * The default chain to filter by: the child chain of the pair selected in the
 * bridge. Combined with either-endpoint matching, this shows every route to and
 * from that chain — and never comes up empty for a non-canonical pair.
 *
 * We read the raw params rather than `useNetworks()` because the latter
 * sanitizes the pair to a canonical bridge route (e.g. Eth <> Orbit collapses to
 * Eth <> Arbitrum One). Falls back to the sanitized chains when a param is absent.
 */
export function useBridgeDefaultChainIds(): number[] {
  const [{ sourceChain: sourceChainParam, destinationChain: destinationChainParam }] =
    useArbQueryParams();
  const [{ sourceChain, destinationChain }] = useNetworks();

  const sourceChainId = sourceChainParam ?? sourceChain.id;
  const destinationChainId = destinationChainParam ?? destinationChain.id;
  const { childChainId } = getNetworksRelationship({ sourceChainId, destinationChainId });

  return useMemo(() => [childChainId], [childChainId]);
}

/**
 * The effective chain filter selection. Derived at read time rather than synced
 * into the store, so the very first render is already scoped (no unfiltered
 * fetch can fire before a default lands) and changing the bridge pair or
 * toggling testnet mode re-defaults automatically.
 */
export function useSelectedChainIds(): number[] {
  const selection = useTransactionHistoryChainFilterStore((state) => state.selection);
  const [isTestnetMode] = useIsTestnetMode();
  const defaultChainIds = useBridgeDefaultChainIds();

  return useMemo(
    () => resolveSelectedChainIds({ selection, isTestnetMode, defaultChainIds }),
    [selection, isTestnetMode, defaultChainIds],
  );
}

// Debounced variant for the (expensive) fetch: toggling several chains in a
// row coalesces into a single refetch while the checkboxes stay instant.
export function useDebouncedSelectedChainIds(): number[] {
  return useDebounce(useSelectedChainIds(), 500);
}
