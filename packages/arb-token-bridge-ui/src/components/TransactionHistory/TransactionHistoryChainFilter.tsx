import {
  Checkbox,
  Popover,
  PopoverButton,
  PopoverPanel,
  Radio,
  RadioGroup,
} from '@headlessui/react';
import {
  CheckIcon,
  ChevronDownIcon,
  FunnelIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { PropsWithChildren, useMemo, useState } from 'react';
import { twMerge } from 'tailwind-merge';

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
import { TestnetToggle } from '../common/TestnetToggle';
import { useTxHistoryChainFilter } from './useTransactionHistoryChainFilter';
import { useTransactionHistoryChainFilterStore } from './useTransactionHistoryChainFilterStore';

// The radio value is the selected chain id; `null` is "All Core Chains".
// Core chains are checkboxes, not radios — when a core subset is checked, no
// radio is selected, expressed by a sentinel no radio can ever have as value.
type ChainRadioOption = number | null;
const NO_RADIO_SELECTED = -1;

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
    <div className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-white/40">
      {children}
    </div>
  );
}

const ROW_CLASSNAME =
  'group flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-[8px] px-3 transition-[background] duration-200 hover:bg-white/10';

function RowLabel({ label }: { label: string }) {
  return <span className="truncate text-sm font-medium text-white">{label}</span>;
}

function ChainRadioRow({ value, label }: { value: ChainRadioOption; label: string }) {
  return (
    <Radio value={value} className={twMerge(ROW_CLASSNAME, 'data-[checked]:bg-[#0B2046]')}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-white/20 group-data-[checked]:border-[#3A96FF]">
          <span className="hidden h-2 w-2 rounded-full bg-[#3A96FF] group-data-[checked]:block" />
        </span>
        <RowLabel label={label} />
      </div>
    </Radio>
  );
}

function CoreChainCheckboxRow({
  label,
  checked,
  onChange,
  nested,
  showIncludedTag,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  nested: boolean;
  showIncludedTag: boolean;
}) {
  return (
    <Checkbox
      checked={checked}
      onChange={onChange}
      className={twMerge(ROW_CLASSNAME, nested && 'pl-7')}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border-2 border-white/20 group-data-[checked]:border-0 group-data-[checked]:bg-arb-blue">
          <CheckIcon className="hidden h-3 w-3 stroke-[3] text-white group-data-[checked]:block" />
        </span>
        <RowLabel label={label} />
      </div>
      {showIncludedTag && (
        <span
          // Hidden from the a11y tree so the row's accessible name stays the chain name.
          aria-hidden="true"
          className="shrink-0 rounded-[4px] bg-arb-blue/10 px-2 py-[3px] text-[11px] font-medium text-[#3A96FF]"
        >
          included
        </span>
      )}
    </Checkbox>
  );
}

function getTriggerLabel(filter: TxHistoryChainFilter): string {
  if (filter.type === 'all-core') {
    return 'All Core Chains';
  }
  if (filter.type === 'longtail-chain') {
    return getNetworkName(filter.chainId);
  }
  const [firstChainId] = filter.chainIds;
  if (filter.chainIds.length === 1 && typeof firstChainId !== 'undefined') {
    return getNetworkName(firstChainId);
  }
  return `${filter.chainIds.length} Core Chains`;
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
  const selectedCoreChainIds = filter.type === 'core-chains' ? filter.chainIds : [];
  const selectedRadioOption: ChainRadioOption = allCoreChainsSelected
    ? null
    : filter.type === 'longtail-chain'
      ? filter.chainId
      : NO_RADIO_SELECTED;

  const selectRadioOption = (option: ChainRadioOption) => {
    trackEvent('Tx History Network Filter', {
      network: option === null ? 'all core chains' : getNetworkName(option),
    });
    setSelection({ chainIds: option === null ? null : [option], isTestnetMode });
  };

  const toggleCoreChain = (chainId: number) => {
    const next = selectedCoreChainIds.includes(chainId)
      ? selectedCoreChainIds.filter((id) => id !== chainId)
      : [...selectedCoreChainIds, chainId];

    trackEvent('Tx History Network Filter', { network: getNetworkName(chainId) });
    // Unchecking the last core chain falls back to "All Core Chains".
    setSelection({ chainIds: next.length > 0 ? next : null, isTestnetMode });
  };

  const triggerLabel = getTriggerLabel(filter);

  const query = search.trim().toLowerCase();
  const visibleChainIds = query
    ? filterableChainIds.filter((chainId) => getNetworkName(chainId).toLowerCase().includes(query))
    : filterableChainIds;
  const coreChainIds = visibleChainIds.filter((chainId) => isCoreChainForDisplay(chainId));
  const moreChainIds = visibleChainIds.filter((chainId) => !isCoreChainForDisplay(chainId));

  // Searching flattens the core section: the "All Core Chains" parent row and
  // the indent under it only render for the full, unfiltered list.
  const showAllCoreChainsRow = !query;

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
              className="z-20 flex w-[340px] max-h-[min(var(--anchor-max-height,420px),420px)] origin-top flex-col overflow-hidden rounded border border-gray-dark bg-gray-1 transition duration-150 data-[closed]:scale-95 data-[closed]:opacity-0"
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
                  value={selectedRadioOption}
                  onChange={selectRadioOption}
                  aria-label="Networks"
                  // Cap the list directly — Headless overrides the panel's max-height via `anchor`.
                  className="max-h-[300px] min-h-0 flex-1 overflow-y-auto px-2 pb-2"
                >
                  {(showAllCoreChainsRow || coreChainIds.length > 0) && (
                    <SectionLabel>Core Chains</SectionLabel>
                  )}

                  {showAllCoreChainsRow && <ChainRadioRow value={null} label="All Core Chains" />}

                  {coreChainIds.length > 0 && (
                    <div className="relative">
                      {showAllCoreChainsRow && (
                        <span
                          aria-hidden="true"
                          className={twMerge(
                            'absolute inset-y-0 left-[21px] w-px',
                            allCoreChainsSelected ? 'bg-[#3A96FF]' : 'bg-white/20',
                          )}
                        />
                      )}
                      {coreChainIds.map((chainId) => (
                        <CoreChainCheckboxRow
                          key={chainId}
                          label={getNetworkName(chainId)}
                          checked={selectedCoreChainIds.includes(chainId)}
                          onChange={() => toggleCoreChain(chainId)}
                          nested={showAllCoreChainsRow}
                          showIncludedTag={allCoreChainsSelected}
                        />
                      ))}
                    </div>
                  )}

                  {moreChainIds.length > 0 && <SectionLabel>More Chains</SectionLabel>}
                  {moreChainIds.map((chainId) => (
                    <ChainRadioRow key={chainId} value={chainId} label={getNetworkName(chainId)} />
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
