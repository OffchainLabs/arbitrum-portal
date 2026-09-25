import { Popover, PopoverButton, PopoverPanel, Radio, RadioGroup } from '@headlessui/react';
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { PropsWithChildren, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { NetworkImage } from '@/bridge/components/common/NetworkImage';
import { Switch } from '@/bridge/components/common/atoms/Switch';
import { getNetworkName, isCoreChainForDisplay } from '@/bridge/util/networks';

function SectionLabel({ children }: PropsWithChildren) {
  return (
    <div className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-white/40">
      {children}
    </div>
  );
}

function ChainRadioRow({ chainId }: { chainId: number }) {
  return (
    <Radio
      value={chainId}
      className={twMerge(
        'group flex h-11 w-full cursor-pointer items-center gap-3 rounded-[8px] px-3 transition-[background] duration-200 hover:bg-white/10',
        'data-[checked]:bg-[#0B2046]',
      )}
    >
      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-white/20 group-data-[checked]:border-[#3A96FF]">
        <span className="hidden h-2 w-2 rounded-full bg-[#3A96FF] group-data-[checked]:block" />
      </span>
      <NetworkImage chainId={chainId} className="h-5 w-5 shrink-0 p-[2px]" size={20} />
      <span className="truncate text-sm font-medium text-white">{getNetworkName(chainId)}</span>
    </Radio>
  );
}

export function ChainSelectDropdown({
  chainIds,
  selectedChainId,
  onChange,
  isTestnetMode,
  onTestnetModeChange,
}: {
  chainIds: number[];
  selectedChainId: number;
  onChange: (chainId: number) => void;
  isTestnetMode: boolean;
  onTestnetModeChange: (isTestnetMode: boolean) => void;
}) {
  const [search, setSearch] = useState('');

  const query = search.trim().toLowerCase();
  const visibleChainIds = query
    ? chainIds.filter((chainId) => getNetworkName(chainId).toLowerCase().includes(query))
    : chainIds;
  const coreChainIds = visibleChainIds.filter((chainId) => isCoreChainForDisplay(chainId));
  const orbitChainIds = visibleChainIds.filter((chainId) => !isCoreChainForDisplay(chainId));

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <PopoverButton
            aria-label="Select destination chain"
            className="arb-hover flex h-12 w-full items-center gap-2.5 rounded-md border border-white/10 bg-default-black px-4 text-left outline-none hover:bg-white/5"
          >
            <NetworkImage chainId={selectedChainId} className="h-6 w-6 p-[2px]" size={24} />
            <span className="grow truncate font-medium">{getNetworkName(selectedChainId)}</span>
            <ChevronDownIcon width={16} className={open ? 'rotate-180' : ''} />
          </PopoverButton>

          <PopoverPanel
            anchor={{ to: 'bottom start', gap: 4, padding: 16 }}
            transition
            className="z-50 flex max-h-[min(var(--anchor-max-height,420px),420px)] w-[var(--button-width)] min-w-[320px] origin-top flex-col overflow-hidden rounded border border-gray-dark bg-gray-1 transition duration-150 data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            {({ close }) => (
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
                  value={selectedChainId}
                  onChange={(chainId: number) => {
                    onChange(chainId);
                    close();
                  }}
                  aria-label="Destination chain"
                  // capped directly, because Headless overrides the panel's max-height via `anchor`
                  className="max-h-[300px] min-h-0 flex-1 overflow-y-auto px-2 pb-2"
                >
                  {coreChainIds.length > 0 && <SectionLabel>Core Chains</SectionLabel>}
                  {coreChainIds.map((chainId) => (
                    <ChainRadioRow key={chainId} chainId={chainId} />
                  ))}

                  {orbitChainIds.length > 0 && <SectionLabel>Arbitrum Chains</SectionLabel>}
                  {orbitChainIds.map((chainId) => (
                    <ChainRadioRow key={chainId} chainId={chainId} />
                  ))}

                  {visibleChainIds.length === 0 && (
                    <div className="px-2 py-3 text-sm text-white/40">No networks found.</div>
                  )}
                </RadioGroup>

                <div className="border-t border-white/10 px-3 py-3">
                  <label className="cursor-pointer">
                    <Switch
                      label={`Testnet mode ${isTestnetMode ? 'ON' : 'OFF'}`}
                      checked={isTestnetMode}
                      onChange={() => onTestnetModeChange(!isTestnetMode)}
                    />
                  </label>
                </div>
              </div>
            )}
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
}
