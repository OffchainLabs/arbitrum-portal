import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useEffect, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';
import { shallow } from 'zustand/shallow';

import { useIsTestnetMode } from '../../hooks/useIsTestnetMode';
import { useNetworks } from '../../hooks/useNetworks';
import { getMultiChainFetchList } from '../../hooks/useTransactionHistory';
import { trackEvent } from '../../util/AnalyticsUtils';
import { getNetworkName, isNetwork, sortChainIds } from '../../util/networks';
import { NetworkImage } from '../common/NetworkImage';
import { Transition } from '../common/Transition';
import { useTransactionHistoryChainFilterStore } from './useTransactionHistoryChainFilterStore';

/**
 * Defaults the chain filter to the chains currently selected in the bridge (the
 * URL query selector). This keeps the initial tx history fetch scoped to the
 * chains the user is actively bridging between, instead of every chain. Once the
 * user changes the filter, this becomes a no-op.
 */
function useInitializeChainFilterFromBridge() {
  const [{ sourceChain, destinationChain }] = useNetworks();
  const initializeFromBridgeChains = useTransactionHistoryChainFilterStore(
    (state) => state.initializeFromBridgeChains,
  );

  useEffect(() => {
    initializeFromBridgeChains([sourceChain.id, destinationChain.id]);
  }, [sourceChain.id, destinationChain.id, initializeFromBridgeChains]);
}

function useFilterableChainIds() {
  const [isTestnetMode] = useIsTestnetMode();

  return useMemo(() => {
    const chainIds = new Set<number>();

    getMultiChainFetchList()
      .filter((chainPair) => isNetwork(chainPair.parentChainId).isTestnet === isTestnetMode)
      .forEach((chainPair) => {
        chainIds.add(chainPair.parentChainId);
        chainIds.add(chainPair.childChainId);
      });

    return sortChainIds(Array.from(chainIds));
  }, [isTestnetMode]);
}

function getButtonLabel(selectedChainIds: number[]) {
  if (selectedChainIds.length === 0) {
    return 'All networks';
  }

  if (selectedChainIds.length === 1) {
    return getNetworkName(selectedChainIds[0] as number);
  }

  return `${selectedChainIds.length} networks`;
}

function ChainOption({
  chainId,
  isSelected,
  onClick,
}: {
  chainId: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between gap-2 rounded-md p-2 text-left text-white hover:bg-white/5"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <NetworkImage chainId={chainId} />
        <span className="truncate">{getNetworkName(chainId)}</span>
      </div>
      {isSelected && <CheckIcon className="h-3 w-3 shrink-0 text-green-500" />}
    </button>
  );
}

export function TransactionHistoryChainFilter() {
  useInitializeChainFilterFromBridge();
  const chainIds = useFilterableChainIds();
  const { selectedChainIds, toggleChainId, clearSelectedChainIds } =
    useTransactionHistoryChainFilterStore(
      (state) => ({
        selectedChainIds: state.selectedChainIds,
        toggleChainId: state.toggleChainId,
        clearSelectedChainIds: state.clearSelectedChainIds,
      }),
      shallow,
    );

  return (
    <Popover className="relative shrink-0">
      {({ open }) => (
        <>
          <PopoverButton
            className={twMerge(
              'flex h-full items-center gap-2 rounded border border-gray-dark bg-black px-3 py-1 text-sm font-light text-white',
              'hover:bg-white/20',
            )}
            aria-label="Filter transaction history by network"
          >
            <span className="max-w-[140px] truncate">{getButtonLabel(selectedChainIds)}</span>
            <ChevronDownIcon
              className={twMerge('h-3 w-3 opacity-30 transition-all', open && 'rotate-180')}
            />
          </PopoverButton>
          <Transition>
            <PopoverPanel className="absolute right-0 z-20 mt-1 w-[260px] origin-top overflow-hidden rounded-md text-sm text-white">
              <div className="flex max-h-[320px] w-full flex-col gap-1 overflow-y-auto rounded-md border border-white/20 bg-black p-2">
                <button
                  className="flex w-full items-center justify-between gap-2 rounded-md p-2 text-left text-white hover:bg-white/5"
                  onClick={() => {
                    trackEvent('Tx History Network Filter', { network: 'all' });
                    clearSelectedChainIds();
                  }}
                >
                  <span>All networks</span>
                  {selectedChainIds.length === 0 && (
                    <CheckIcon className="h-3 w-3 shrink-0 text-green-500" />
                  )}
                </button>
                <div className="my-1 h-px w-full bg-white/10" />
                {chainIds.map((chainId) => (
                  <ChainOption
                    key={chainId}
                    chainId={chainId}
                    isSelected={selectedChainIds.includes(chainId)}
                    onClick={() => {
                      trackEvent('Tx History Network Filter', {
                        network: getNetworkName(chainId),
                      });
                      toggleChainId(chainId);
                    }}
                  />
                ))}
              </div>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  );
}

export function TransactionHistoryChainFilterNotice() {
  const selectedChainIds = useTransactionHistoryChainFilterStore((state) => state.selectedChainIds);

  if (selectedChainIds.length === 0) {
    return null;
  }

  const networkNames = selectedChainIds.map((chainId) => getNetworkName(chainId)).join(', ');

  return (
    <div className="mb-4 flex items-center gap-2 rounded border border-cyan-dark bg-cyan px-3 py-2 text-xs text-cyan-dark">
      <span>
        Showing transactions for <span className="font-medium">{networkNames}</span> only. Select
        “All networks” to view transactions across every chain.
      </span>
    </div>
  );
}
