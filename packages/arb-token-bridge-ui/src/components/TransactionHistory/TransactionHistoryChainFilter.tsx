import { Popover, PopoverButton, PopoverPanel, Radio, RadioGroup } from '@headlessui/react';
import {
  ChevronDownIcon,
  FunnelIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { PropsWithChildren, ReactNode, useMemo, useState } from 'react';

import { Tooltip } from '@/app/components/common/Tooltip';

import { useIsTestnetMode } from '../../hooks/useIsTestnetMode';
import { trackEvent } from '../../util/AnalyticsUtils';
import { TxHistoryChainFilter, matchesChainFilter } from '../../util/chainFilter';
import { getNetworkName, isCoreChainForDisplay } from '../../util/networks';
import {
  ChainPair,
  getTxHistoryFilterableChainIds,
  getTxHistoryRoutes,
} from '../../util/txHistoryRoutes';
import { Button } from '../common/Button';
import { NetworkImage } from '../common/NetworkImage';
import { TestnetToggle } from '../common/TestnetToggle';
import { useTxHistoryChainFilter } from './useTransactionHistoryChainFilter';
import { useTransactionHistoryChainFilterStore } from './useTransactionHistoryChainFilterStore';

// The radio value is the selected chain id; `null` is "All Core Chains",
// mirroring the store's selection shape.
type ChainFilterOption = number | null;

function useTxHistoryRoutes(filter: TxHistoryChainFilter) {
  const [isTestnetMode] = useIsTestnetMode();

  const filterableChainIds = useMemo(
    () => getTxHistoryFilterableChainIds({ isTestnetMode }),
    [isTestnetMode],
  );

  const eligibleRoutes = useMemo(
    () =>
      getTxHistoryRoutes({ isTestnetMode }).filter((route) =>
        matchesChainFilter({
          filter,
          sourceChainId: route.parentChainId,
          destinationChainId: route.childChainId,
        }),
      ),
    [isTestnetMode, filter],
  );

  return { filterableChainIds, eligibleRoutes };
}

function SectionLabel({ children }: PropsWithChildren) {
  return (
    <div className="px-2 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-white/40">
      {children}
    </div>
  );
}

function ChainRadioRow({ value, label }: { value: ChainFilterOption; label: ReactNode }) {
  return (
    <Radio
      value={value}
      className="group arb-hover flex w-full cursor-pointer items-center gap-2 rounded px-2 py-2 transition-[background] duration-200 hover:bg-white/10"
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1px] border-gray-6 bg-dark group-data-[checked]:border-white">
        <span className="hidden h-2 w-2 rounded-full bg-white group-data-[checked]:block" />
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-gray-3 group-data-[checked]:text-white">
        {label}
      </div>
    </Radio>
  );
}

function ChainLabel({ chainId }: { chainId: number }) {
  return (
    <>
      <NetworkImage chainId={chainId} />
      <span className="truncate text-sm">{getNetworkName(chainId)}</span>
    </>
  );
}

// A hub chain can match dozens of routes; an over-tall tooltip renders off-screen.
const MAX_TOOLTIP_ROUTES = 6;

function EligibleRoutesTooltip({ chainPairs }: { chainPairs: ChainPair[] }) {
  const visibleRoutes = chainPairs.slice(0, MAX_TOOLTIP_ROUTES);
  const hiddenRouteCount = chainPairs.length - visibleRoutes.length;

  return (
    <Tooltip
      // Focusable trigger so keyboard users can reveal the tooltip.
      as="button"
      content={
        <div className="flex flex-col gap-1 text-xs">
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
  const filter = useTxHistoryChainFilter();
  const setSelection = useTransactionHistoryChainFilterStore((state) => state.setSelection);

  const { filterableChainIds, eligibleRoutes } = useTxHistoryRoutes(filter);

  const [search, setSearch] = useState('');

  const allCoreChainsSelected = filter.type === 'all-core';
  const selectedOption: ChainFilterOption = allCoreChainsSelected ? null : filter.chainId;

  const selectOption = (option: ChainFilterOption) => {
    trackEvent('Tx History Network Filter', {
      network: option === null ? 'all core chains' : getNetworkName(option),
    });
    setSelection({ chainId: option, isTestnetMode });
  };

  const triggerLabel = allCoreChainsSelected ? 'All Core Chains' : getNetworkName(filter.chainId);

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

                <RadioGroup
                  value={selectedOption}
                  onChange={selectOption}
                  aria-label="Networks"
                  // Cap the list directly — Headless overrides the panel's max-height via `anchor`.
                  className="max-h-[260px] min-h-0 flex-1 overflow-y-auto px-2 pb-2"
                >
                  {!query && (
                    <ChainRadioRow
                      value={null}
                      label={
                        <>
                          <span className="h-4 w-4 shrink-0 rounded-full bg-all-chains-gradient" />
                          <span className="truncate text-sm">All Core Chains</span>
                        </>
                      }
                    />
                  )}

                  {coreChainIds.length > 0 && <SectionLabel>Core Chains</SectionLabel>}
                  {coreChainIds.map((chainId) => (
                    <ChainRadioRow
                      key={chainId}
                      value={chainId}
                      label={<ChainLabel chainId={chainId} />}
                    />
                  ))}

                  {moreChainIds.length > 0 && <SectionLabel>More Chains</SectionLabel>}
                  {moreChainIds.map((chainId) => (
                    <ChainRadioRow
                      key={chainId}
                      value={chainId}
                      label={<ChainLabel chainId={chainId} />}
                    />
                  ))}

                  {visibleChainIds.length === 0 && (
                    <div className="px-2 py-3 text-sm text-white/40">No networks found.</div>
                  )}
                </RadioGroup>

                <div className="border-t border-white/10 px-3 py-3">
                  <TestnetToggle label="Testnet mode" includeToggleStateOnLabel />
                </div>
              </div>
            </PopoverPanel>
          </>
        )}
      </Popover>
      <EligibleRoutesTooltip chainPairs={eligibleRoutes} />
    </div>
  );
}
