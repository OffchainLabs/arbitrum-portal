import { useMemo } from 'react';

import { useIsTestnetMode } from '../../hooks/useIsTestnetMode';
import { useMode } from '../../hooks/useMode';
import { useNetworks } from '../../hooks/useNetworks';
import { TxHistoryChainFilter, resolveChainFilter } from '../../util/chainFilter';
import { getNetworksRelationship } from '../../util/getNetworksRelationship';
import { isCoreChainForDisplay } from '../../util/networks';
import { getTxHistoryCoreChainIds } from '../../util/txHistoryRoutes';
import { useTransactionHistoryChainFilterStore } from './useTransactionHistoryChainFilterStore';

/** The core chains of the current network mode. */
export function useCoreChainIds(): number[] {
  const [isTestnetMode] = useIsTestnetMode();

  return useMemo(() => getTxHistoryCoreChainIds({ isTestnetMode }), [isTestnetMode]);
}

/**
 * Overrides the "All Core Chains" default with the bridge pair's child chain
 * when that would hide the user's own transactions: a pair targeting a
 * longtail chain (via query params, including smart-contract wallets whose
 * connected chain is synced into the pair) means the user's history lives on
 * a chain the core-only default excludes. The embed widget always follows its
 * pair — it renders no filter UI to recover with.
 */
function useDefaultChainIdOverride(): number | undefined {
  const { embedMode } = useMode();
  const [{ sourceChain, destinationChain }] = useNetworks();

  const { childChainId } = getNetworksRelationship({
    sourceChainId: sourceChain.id,
    destinationChainId: destinationChain.id,
  });

  if (embedMode || !isCoreChainForDisplay(childChainId)) {
    return childChainId;
  }

  return undefined;
}

/**
 * The effective chain filter, derived at read time: the first render is
 * already scoped to the default, and bridge-pair or testnet-mode changes
 * re-default automatically until the user makes an explicit selection.
 */
export function useTxHistoryChainFilter(): TxHistoryChainFilter {
  const selection = useTransactionHistoryChainFilterStore((state) => state.selection);
  const [isTestnetMode] = useIsTestnetMode();
  const coreChainIds = useCoreChainIds();
  const defaultChainIdOverride = useDefaultChainIdOverride();

  return useMemo(() => {
    const effectiveSelection =
      selection ??
      (typeof defaultChainIdOverride !== 'undefined'
        ? { chainId: defaultChainIdOverride, isTestnetMode }
        : null);

    return resolveChainFilter({ selection: effectiveSelection, isTestnetMode, coreChainIds });
  }, [selection, isTestnetMode, coreChainIds, defaultChainIdOverride]);
}
