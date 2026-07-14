import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import {
  ChevronDownIcon,
  FunnelIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { PropsWithChildren, useMemo, useState } from 'react';

import { Tooltip } from '@/app/components/common/Tooltip';

import { useIsTestnetMode } from '../../hooks/useIsTestnetMode';
import { trackEvent } from '../../util/AnalyticsUtils';
import { isChainFilterActive, matchesChainFilter } from '../../util/chainFilter';
import { getNetworkName, isCoreChainForDisplay, sortChainIds } from '../../util/networks';
import { ChainPair, getTxHistoryRoutes } from '../../util/txHistoryRoutes';
import { Button } from '../common/Button';
import { Checkbox } from '../common/Checkbox';
import { NetworkImage } from '../common/NetworkImage';
import { TestnetToggle } from '../common/TestnetToggle';
import { useBridgeDefaultChainIds, useSelectedChainIds } from './useTransactionHistoryChainFilter';
import { useTransactionHistoryChainFilterStore } from './useTransactionHistoryChainFilterStore';

function useTxHistoryRoutes(selectedChainIds: number[]) {
  const [isTestnetMode] = useIsTestnetMode();

  return useMemo(() => {
    const routes = getTxHistoryRoutes({ isTestnetMode });

    const filterableChainIds = sortChainIds(
      Array.from(new Set(routes.flatMap((route) => [route.parentChainId, route.childChainId]))),
    );

    const eligibleRoutes = routes.filter((route) =>
      matchesChainFilter({
        selectedChainIds,
        sourceChainId: route.parentChainId,
        destinationChainId: route.childChainId,
      }),
    );

    return { filterableChainIds, eligibleRoutes };
  }, [isTestnetMode, selectedChainIds]);
}

function SectionLabel({ children }: PropsWithChildren) {
  return (
    <div className="px-2 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-white/40">
      {children}
    </div>
  );
}

function ChainRow({
  chainId,
  checked,
  onToggle,
}: {
  chainId: number;
  checked: boolean;
  onToggle: (chainId: number) => void;
}) {
  return (
    <div className="rounded px-2 py-2 transition-[background] duration-200 hover:bg-white/10">
      <Checkbox
        label={
          <div className="flex items-center gap-2 overflow-hidden">
            <NetworkImage chainId={chainId} />
            <span className="truncate text-sm">{getNetworkName(chainId)}</span>
          </div>
        }
        labelClassName="min-w-0 flex-1"
        checked={checked}
        onChange={() => onToggle(chainId)}
      />
    </div>
  );
}

// A hub chain can match dozens of routes; an over-tall tooltip renders off-screen.
const MAX_TOOLTIP_ROUTES = 6;

function EligibleRoutesTooltip({
  chainPairs,
  allChainsSelected,
}: {
  chainPairs: ChainPair[];
  allChainsSelected: boolean;
}) {
  const visibleRoutes = chainPairs.slice(0, MAX_TOOLTIP_ROUTES);
  const hiddenRouteCount = chainPairs.length - visibleRoutes.length;

  return (
    <Tooltip
      // Focusable trigger so keyboard users can reveal the tooltip.
      as="button"
      content={
        <div className="flex flex-col gap-1 text-xs">
          {allChainsSelected ? (
            <span>Showing transaction history for all supported routes.</span>
          ) : (
            <>
              <span className="font-medium">Showing history for these routes:</span>
              {visibleRoutes.map((pair) => (
                <span key={`${pair.parentChainId}-${pair.childChainId}`}>
                  {getNetworkName(pair.parentChainId)} ↔ {getNetworkName(pair.childChainId)}
                </span>
              ))}
              {hiddenRouteCount > 0 && (
                <span className="text-white/70">
                  and {hiddenRouteCount} more route{hiddenRouteCount === 1 ? '' : 's'}
                </span>
              )}
            </>
          )}
        </div>
      }
    >
      <InformationCircleIcon
        className="h-4 w-4 shrink-0 text-white/50"
        aria-label="Which routes are shown"
      />
    </Tooltip>
  );
}

export function TransactionHistoryChainFilter() {
  const [isTestnetMode] = useIsTestnetMode();
  const defaultChainIds = useBridgeDefaultChainIds();
  const selectedChainIds = useSelectedChainIds();
  const setSelection = useTransactionHistoryChainFilterStore((state) => state.setSelection);

  const { filterableChainIds, eligibleRoutes } = useTxHistoryRoutes(selectedChainIds);

  const [search, setSearch] = useState('');

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
    const isAllChains = next.size === 0 || next.size === filterableChainIds.length;
    setSelection({ chainIds: isAllChains ? [] : Array.from(next), isTestnetMode });
  };

  // Unchecking "All Chains" falls back to the bridge default rather than an
  // empty selection.
  const toggleAllChains = () => {
    if (allChainsSelected) {
      trackEvent('Tx History Network Filter', { network: 'default' });
      setSelection({ chainIds: defaultChainIds, isTestnetMode });
      return;
    }
    trackEvent('Tx History Network Filter', { network: 'all' });
    setSelection({ chainIds: [], isTestnetMode });
  };

  const selectedChainNames = filterableChainIds
    .filter((chainId) => selectedChainIds.includes(chainId))
    .map((chainId) => getNetworkName(chainId));
  const showAllChainsLabel = allChainsSelected || selectedChainNames.length === 0;
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
    <div className="flex items-center gap-1.5">
      <Popover className="relative">
        {({ open }) => (
          <>
            <PopoverButton
              as={Button}
              variant="secondary"
              className="px-[10px] py-[5px] h-[36px]"
              aria-label="Filter transaction history by network"
            >
              <div className="flex flex-nowrap items-center gap-1 text-sm leading-[1.1]">
                <FunnelIcon width={16} className="shrink-0 text-white/70" />
                <span className="max-w-[220px] truncate font-light">{triggerLabel}</span>
                <ChevronDownIcon width={12} className={open ? 'rotate-180' : ''} />
              </div>
            </PopoverButton>
            <PopoverPanel
              // Portal + anchor to the button so the panel escapes the tx history
              // panel's overflow (which clipped it on mobile); padding keeps it off the edges.
              anchor={{ to: 'bottom start', gap: 4, padding: 16 }}
              transition
              className="z-20 flex w-[280px] max-h-[min(var(--anchor-max-height,420px),420px)] origin-top flex-col overflow-hidden rounded border border-gray-dark bg-gray-1 transition duration-150 data-[closed]:scale-95 data-[closed]:opacity-0"
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
                  // Cap the list directly — Headless overrides the panel's max-height via `anchor`.
                  className="max-h-[260px] min-h-0 flex-1 overflow-y-auto px-2 pb-2"
                >
                  {!query && (
                    <div className="rounded px-2 py-2 transition-[background] duration-200 hover:bg-white/10">
                      <Checkbox
                        label={
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="h-4 w-4 shrink-0 rounded-full bg-all-chains-gradient" />
                            <span className="truncate text-sm">All Chains</span>
                          </div>
                        }
                        labelClassName="min-w-0 flex-1"
                        checked={allChainsSelected}
                        onChange={toggleAllChains}
                      />
                    </div>
                  )}

                  {coreChainIds.length > 0 && <SectionLabel>Core Chains</SectionLabel>}
                  {coreChainIds.map((chainId) => (
                    <ChainRow
                      key={chainId}
                      chainId={chainId}
                      checked={isChainChecked(chainId)}
                      onToggle={toggleChain}
                    />
                  ))}

                  {moreChainIds.length > 0 && <SectionLabel>More Chains</SectionLabel>}
                  {moreChainIds.map((chainId) => (
                    <ChainRow
                      key={chainId}
                      chainId={chainId}
                      checked={isChainChecked(chainId)}
                      onToggle={toggleChain}
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
      <EligibleRoutesTooltip chainPairs={eligibleRoutes} allChainsSelected={allChainsSelected} />
    </div>
  );
}
