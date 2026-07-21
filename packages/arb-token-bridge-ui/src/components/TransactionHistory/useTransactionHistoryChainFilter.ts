import { useMemo } from 'react';
import { useAccount } from 'wagmi';

import { useAccountType } from '../../hooks/useAccountType';
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
 * Surfaces where the "All Core Chains" default would hide the only relevant
 * history default to a single chain instead: the embed widget is scoped to its
 * bridge pair and renders no filter UI to recover with, and a smart-contract
 * wallet's history is scoped to its connected chain by design, so a longtail
 * connected chain would otherwise intersect to an empty fetch list.
 */
function useDefaultChainIdOverride(): number | undefined {
  const { embedMode } = useMode();
  const [{ sourceChain, destinationChain }] = useNetworks();
  const { chain } = useAccount();
  const { accountType } = useAccountType();

  if (embedMode) {
    const { childChainId } = getNetworksRelationship({
      sourceChainId: sourceChain.id,
      destinationChainId: destinationChain.id,
    });
    return childChainId;
  }

  if (
    accountType === 'smart-contract-wallet' &&
    typeof chain !== 'undefined' &&
    !isCoreChainForDisplay(chain.id)
  ) {
    return chain.id;
  }

  return undefined;
}

/**
 * The effective chain filter, derived at read time: the first render is
 * already scoped to the "All Core Chains" default, and testnet-mode changes
 * re-default automatically.
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
