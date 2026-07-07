import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import {
  CheckIcon,
  ChevronDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { shallow } from 'zustand/shallow';

import { useIsTestnetMode } from '../../hooks/useIsTestnetMode';
import { useNetworks } from '../../hooks/useNetworks';
import { getMultiChainFetchList } from '../../hooks/useTransactionHistory';
import { trackEvent } from '../../util/AnalyticsUtils';
import {
  getNetworkName,
  isCoreChainForDisplay,
  isNetwork,
  sortChainIds,
} from '../../util/networks';
import { Button } from '../common/Button';
import { NetworkImage } from '../common/NetworkImage';
import { TestnetToggle } from '../common/TestnetToggle';
import {
  isChainFilterActive,
  useTransactionHistoryChainFilterStore,
} from './useTransactionHistoryChainFilterStore';

/**
 * The chains the user can filter transaction history by: every chain that
 * appears in the multi-chain fetch list for the current testnet/mainnet mode.
 */
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

/**
 * Defaults the filter to the chains currently selected in the bridge (the URL
 * query selector), so the initial fetch is scoped to the chains the user is
 * actively bridging between. Becomes a no-op once the user changes the filter.
 * When the user switches between testnet and mainnet, the selection is reset to
 * "All Chains" to avoid filtering by chains that don't exist in the new mode.
 */
function useSyncChainFilterWithBridge() {
  const [{ sourceChain, destinationChain }] = useNetworks();
  const [isTestnetMode] = useIsTestnetMode();
  const { initializeFromBridgeChains, clearSelectedChainIds } =
    useTransactionHistoryChainFilterStore(
      (state) => ({
        initializeFromBridgeChains: state.initializeFromBridgeChains,
        clearSelectedChainIds: state.clearSelectedChainIds,
      }),
      shallow,
    );

  useEffect(() => {
    initializeFromBridgeChains([sourceChain.id, destinationChain.id]);
  }, [sourceChain.id, destinationChain.id, initializeFromBridgeChains]);

  const previousTestnetMode = useRef(isTestnetMode);
  useEffect(() => {
    if (previousTestnetMode.current !== isTestnetMode) {
      previousTestnetMode.current = isTestnetMode;
      clearSelectedChainIds();
    }
  }, [isTestnetMode, clearSelectedChainIds]);
}

function CheckboxBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={twMerge(
        'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm border-[1px]',
        checked ? 'border-dark bg-white' : 'border-gray-6 bg-dark',
      )}
    >
      {checked && <CheckIcon className="h-[10px] w-[10px] stroke-[5] text-dark" />}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-white/40">
      {children}
    </div>
  );
}

function ChainRow({
  chainId,
  checked,
  onClick,
}: {
  chainId: number;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left transition-[background] duration-200 hover:bg-white/10"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <NetworkImage chainId={chainId} />
        <span className="truncate text-sm text-white">{getNetworkName(chainId)}</span>
      </div>
      <CheckboxBox checked={checked} />
    </button>
  );
}

export function TransactionHistoryChainFilter() {
  useSyncChainFilterWithBridge();

  const [{ sourceChain, destinationChain }] = useNetworks();
  const filterableChainIds = useFilterableChainIds();
  const { selectedChainIds, setSelectedChainIds, clearSelectedChainIds } =
    useTransactionHistoryChainFilterStore(
      (state) => ({
        selectedChainIds: state.selectedChainIds,
        setSelectedChainIds: state.setSelectedChainIds,
        clearSelectedChainIds: state.clearSelectedChainIds,
      }),
      shallow,
    );

  const [search, setSearch] = useState('');

  // Empty selection means "All Chains" (no filtering). When every chain is
  // selected we also represent it as "All Chains" so the two states stay in sync.
  const allChainsSelected = !isChainFilterActive(selectedChainIds);

  const isChainChecked = (chainId: number) =>
    allChainsSelected || selectedChainIds.includes(chainId);

  const toggleChain = (chainId: number) => {
    trackEvent('Tx History Network Filter', { network: getNetworkName(chainId) });

    const next = new Set(allChainsSelected ? filterableChainIds : selectedChainIds);
    if (next.has(chainId)) {
      next.delete(chainId);
    } else {
      next.add(chainId);
    }

    // Collapse "none" and "all" back to the All Chains state.
    if (next.size === 0 || next.size === filterableChainIds.length) {
      clearSelectedChainIds();
      return;
    }

    setSelectedChainIds(Array.from(next));
  };

  // Toggles between "All Chains" and the bridge's default chains (the ones in
  // the URL query params, i.e. source + destination).
  const toggleAllChains = () => {
    if (allChainsSelected) {
      trackEvent('Tx History Network Filter', { network: 'default' });
      setSelectedChainIds([sourceChain.id, destinationChain.id]);
      return;
    }
    trackEvent('Tx History Network Filter', { network: 'all' });
    clearSelectedChainIds();
  };

  const selectedChainNames = filterableChainIds
    .filter((chainId) => selectedChainIds.includes(chainId))
    .map((chainId) => getNetworkName(chainId));
  // Fall back to "All Chains" when nothing specific is selected.
  const showAllChainsLabel = allChainsSelected || selectedChainNames.length === 0;
  // Show up to the first two chains by name, then " and N others" for the rest.
  const visibleChainNames = selectedChainNames.slice(0, 2);
  const hiddenChainCount = selectedChainNames.length - visibleChainNames.length;
  const triggerLabel = showAllChainsLabel
    ? 'All Chains'
    : hiddenChainCount > 0
      ? `${visibleChainNames.join(', ')} and ${hiddenChainCount} other${
          hiddenChainCount === 1 ? '' : 's'
        }`
      : visibleChainNames.join(', ');

  const query = search.trim().toLowerCase();
  const visibleChainIds = query
    ? filterableChainIds.filter((chainId) => getNetworkName(chainId).toLowerCase().includes(query))
    : filterableChainIds;
  const coreChainIds = visibleChainIds.filter((chainId) => isCoreChainForDisplay(chainId));
  const moreChainIds = visibleChainIds.filter((chainId) => !isCoreChainForDisplay(chainId));

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <PopoverButton
            as={Button}
            variant="secondary"
            className="px-[10px] py-[5px]"
            aria-label="Filter transaction history by network"
          >
            <div className="flex flex-nowrap items-center gap-1 text-sm leading-[1.1] h-[36px]">
              <FunnelIcon width={16} className="shrink-0 text-white/70" />
              <span className="truncate font-light" style={{ maxWidth: 220 }}>
                {triggerLabel}
              </span>
              <ChevronDownIcon width={12} className={open ? 'rotate-180' : ''} />
            </div>
          </PopoverButton>
          <PopoverPanel
            // `anchor` portals the panel to the document body and positions it
            // relative to the button, so it isn't clipped by the transaction
            // history panel's overflow (which cut it off on mobile). `padding`
            // keeps it clear of the viewport edges.
            anchor={{ to: 'bottom start', gap: 4, padding: 16 }}
            transition
            // Cap the height to the space the anchor leaves us (respecting the
            // padding above), clamped so it never grows taller than 420px.
            // Set inline so it holds even before Tailwind regenerates this file.
            style={{ width: 280, maxHeight: 'min(var(--anchor-max-height, 420px), 420px)' }}
            className="z-20 flex origin-top flex-col overflow-hidden rounded border border-gray-dark bg-gray-1 transition duration-150 data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="p-2">
                <div className="relative flex w-full items-center rounded bg-black/50 text-white shadow-input">
                  <MagnifyingGlassIcon className="absolute left-3 top-[11px] h-3 w-3 shrink-0" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by network name"
                    aria-label="Search networks"
                    className="w-full rounded bg-transparent py-2 pl-8 pr-2 text-sm font-light placeholder:text-sm placeholder:text-white"
                  />
                </div>
              </div>

              <div
                // Cap the scrollable list directly (Headless overrides the
                // panel's max-height via the anchor), so the dropdown stays short.
                style={{ maxHeight: 260 }}
                className="min-h-0 flex-1 overflow-y-auto px-2 pb-2"
              >
                {!query && (
                  <button
                    className="flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left transition-[background] duration-200 hover:bg-white/10"
                    onClick={toggleAllChains}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span
                        className="h-4 w-4 shrink-0 rounded-full"
                        style={{
                          background: 'linear-gradient(135deg, #34d399, #22d3ee, #3b82f6)',
                        }}
                      />
                      <span className="truncate text-sm text-white">All Chains</span>
                    </div>
                    <CheckboxBox checked={allChainsSelected} />
                  </button>
                )}

                {coreChainIds.length > 0 && <SectionLabel>Core Chains</SectionLabel>}
                {coreChainIds.map((chainId) => (
                  <ChainRow
                    key={chainId}
                    chainId={chainId}
                    checked={isChainChecked(chainId)}
                    onClick={() => toggleChain(chainId)}
                  />
                ))}

                {moreChainIds.length > 0 && <SectionLabel>More Chains</SectionLabel>}
                {moreChainIds.map((chainId) => (
                  <ChainRow
                    key={chainId}
                    chainId={chainId}
                    checked={isChainChecked(chainId)}
                    onClick={() => toggleChain(chainId)}
                  />
                ))}

                {visibleChainIds.length === 0 && (
                  <div className="px-2 py-3 text-sm text-white/40">No networks found.</div>
                )}
              </div>

              <div className="border-t border-white/10 px-3 py-3">
                <TestnetToggle label="Testnet mode" includeToggleStateOnLabel />
              </div>
            </div>
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
}
