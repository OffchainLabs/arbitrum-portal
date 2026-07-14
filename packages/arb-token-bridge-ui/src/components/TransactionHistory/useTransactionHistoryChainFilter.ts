import { useMemo } from 'react';

import { useIsTestnetMode } from '../../hooks/useIsTestnetMode';
import { useNetworks } from '../../hooks/useNetworks';
import { resolveSelectedChainIds } from '../../util/chainFilter';
import { getNetworksRelationship } from '../../util/getNetworksRelationship';
import { useTransactionHistoryChainFilterStore } from './useTransactionHistoryChainFilterStore';

/**
 * The default chain to filter by: the child chain of the (sanitized) pair
 * selected in the bridge. With either-endpoint matching, this shows every route
 * to and from that chain.
 */
export function useBridgeDefaultChainIds(): number[] {
  const [{ sourceChain, destinationChain }] = useNetworks();

  const { childChainId } = getNetworksRelationship({
    sourceChainId: sourceChain.id,
    destinationChainId: destinationChain.id,
  });

  return useMemo(() => [childChainId], [childChainId]);
}

/**
 * The effective chain filter selection, derived at read time: the first render
 * is already scoped, and bridge-pair or testnet changes re-default automatically.
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
