import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { Address, isAddress, isHash } from 'viem';
import { useAccount } from 'wagmi';
import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

import { Tooltip } from '@/app/components/common/Tooltip';

import { useIsTestnetMode } from '../../hooks/useIsTestnetMode';
import { trackEvent } from '../../util/AnalyticsUtils';
import { TransactionHistoryChainFilter } from './TransactionHistoryChainFilter';

export enum TransactionHistorySearchError {
  INVALID_ADDRESS = 'That doesn’t seem to be a valid address, please try again.',
  INVALID_TX_HASH = 'That doesn’t seem to be a valid transaction hash, please try again.',
}

type TransactionHistorySearchMode = 'address' | 'txHash';

const searchModeConfig: Record<
  TransactionHistorySearchMode,
  { label: string; placeholder: string; tooltip: string }
> = {
  address: {
    label: 'Address',
    placeholder: 'Search by wallet address',
    tooltip:
      'Search any wallet address to view transactions and claim withdrawals for them. The funds will arrive at the destination wallet address specified by the original withdrawal transaction.',
  },
  txHash: {
    label: 'Tx Hash',
    placeholder: 'Search by transaction hash',
    tooltip: 'Search a transaction hash to find your bridge transaction.',
  },
};

type TransactionHistoryAddressStore = {
  address: string;
  sanitizedAddress: Address | undefined;
  sanitizedTxHash: string | undefined;
  searchMode: TransactionHistorySearchMode;
  searchError: TransactionHistorySearchError | undefined;
  setAddress: (address: string) => void;
  setSanitizedAddress: (address: string) => void;
  setSanitizedTxHash: (txHash: string | undefined) => void;
  setSearchMode: (searchMode: TransactionHistorySearchMode) => void;
  setSearchError: (error: TransactionHistorySearchError | undefined) => void;
  resetSearch: () => void;
};

export const useTransactionHistoryAddressStore = create<TransactionHistoryAddressStore>((set) => ({
  address: '',
  sanitizedAddress: undefined,
  sanitizedTxHash: undefined,
  searchMode: 'address',
  setAddress: (address: string) => set({ address }),
  setSanitizedAddress: (address: string) => {
    if (isAddress(address)) {
      set({ sanitizedAddress: address });
    }
  },
  setSanitizedTxHash: (txHash: string | undefined) => {
    if (typeof txHash === 'undefined' || isHash(txHash)) {
      set({ sanitizedTxHash: txHash });
    }
  },
  setSearchMode: (searchMode: TransactionHistorySearchMode) =>
    set({ searchMode, searchError: undefined, sanitizedTxHash: undefined }),
  searchError: undefined,
  setSearchError: (error: TransactionHistorySearchError | undefined) => set({ searchError: error }),
  resetSearch: () =>
    set({
      address: '',
      sanitizedAddress: undefined,
      sanitizedTxHash: undefined,
      searchMode: 'address',
      searchError: undefined,
    }),
}));

/**
 * `sanitizedTxHash` is only returned while the tx hash mode is active, so it
 * can be passed straight to `useTransactionHistory`.
 */
export function useTxHashSearchState() {
  const { searchMode, sanitizedTxHash } = useTransactionHistoryAddressStore(
    (state) => ({
      searchMode: state.searchMode,
      sanitizedTxHash: state.sanitizedTxHash,
    }),
    shallow,
  );

  const isTxHashSearch = searchMode === 'txHash' && typeof sanitizedTxHash !== 'undefined';

  return {
    isTxHashSearch,
    sanitizedTxHash: isTxHashSearch ? sanitizedTxHash : undefined,
  };
}

function isNewSearch(searchInput: string, currentSearchValue: string | undefined) {
  return searchInput.toLowerCase() !== currentSearchValue?.toLowerCase();
}

export function TransactionHistorySearchBar() {
  const {
    address,
    searchMode,
    searchError,
    sanitizedAddress,
    sanitizedTxHash,
    setAddress,
    setSanitizedAddress,
    setSanitizedTxHash,
    setSearchMode,
    setSearchError,
  } = useTransactionHistoryAddressStore(
    (state) => ({
      address: state.address,
      searchMode: state.searchMode,
      searchError: state.searchError,
      sanitizedAddress: state.sanitizedAddress,
      sanitizedTxHash: state.sanitizedTxHash,
      setAddress: state.setAddress,
      setSanitizedAddress: state.setSanitizedAddress,
      setSanitizedTxHash: state.setSanitizedTxHash,
      setSearchMode: state.setSearchMode,
      setSearchError: state.setSearchError,
    }),
    shallow,
  );
  const { address: connectedAddress } = useAccount();
  const [isTestnetMode] = useIsTestnetMode();

  useEffect(() => {
    if (address === '') {
      setSanitizedTxHash(undefined);
    }
    if (address === '' && connectedAddress) {
      setSanitizedAddress(connectedAddress);
      setSearchError(undefined);
    }
  }, [address, connectedAddress, setSanitizedAddress, setSanitizedTxHash, setSearchError]);

  const searchTx = useCallback(
    (mode: TransactionHistorySearchMode = searchMode) => {
      const searchInput = address.trim();

      if (searchInput === '') {
        return;
      }

      if (mode === 'txHash') {
        if (!isHash(searchInput)) {
          setSearchError(TransactionHistorySearchError.INVALID_TX_HASH);
          return;
        }

        // resubmitting the same hash (enter, blur) is not a new search
        if (isNewSearch(searchInput, sanitizedTxHash)) {
          trackEvent('Search Tx for Tx Hash Click', { isTestnetMode });
        }

        setSanitizedTxHash(searchInput);
        setSearchError(undefined);
        return;
      }

      if (!isAddress(searchInput)) {
        setSearchError(TransactionHistorySearchError.INVALID_ADDRESS);
        return;
      }

      // resubmitting the same address (enter, blur) is not a new search
      if (isNewSearch(searchInput, sanitizedAddress)) {
        trackEvent('Search Tx for Address Click', {
          isTestnetMode,
          isConnectedAddress: searchInput.toLowerCase() === connectedAddress?.toLowerCase(),
        });
      }

      setSanitizedAddress(searchInput);
      setSearchError(undefined);
    },
    [
      address,
      searchMode,
      sanitizedAddress,
      sanitizedTxHash,
      setSanitizedAddress,
      setSanitizedTxHash,
      setSearchError,
      isTestnetMode,
      connectedAddress,
    ],
  );

  // A mode switch reruns the search when the input is already valid for the
  // new mode, so the user does not have to submit again.
  const handleSearchModeChange = useCallback(
    (mode: TransactionHistorySearchMode) => {
      setSearchMode(mode);
      const searchInput = address.trim();
      if (searchInput === '') {
        return;
      }
      if (mode === 'txHash' ? isHash(searchInput) : isAddress(searchInput)) {
        searchTx(mode);
      }
    },
    [address, searchTx, setSearchMode],
  );

  return (
    <div className="mb-4 flex flex-col items-stretch gap-2 pr-4 md:flex-row md:justify-between md:pr-0">
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap text-sm font-light text-white/60">
          Showing history for:
        </span>
        <TransactionHistoryChainFilter />
      </div>
      <form
        className={twMerge(
          // gray-9 pops against the panel's #191919 background, per the design
          'relative flex h-[44px] w-full items-center gap-[10px] rounded-[10px] bg-gray-9 pl-[10px] pr-[15px] text-white md:w-1/2',
          // subtle keyboard focus indicator; the design has no thick focus outline
          'focus-within:ring-1 focus-within:ring-inset focus-within:ring-white/30',
          searchError && 'border border-destructive',
        )}
        onSubmit={(event) => {
          event.preventDefault();
          searchTx();
        }}
      >
        <Listbox value={searchMode} onChange={handleSearchModeChange}>
          <ListboxButton
            className="arb-hover flex shrink-0 select-none items-center gap-1 text-sm tracking-[-0.28px]"
            aria-label="Transaction history search mode"
          >
            {searchModeConfig[searchMode].label}
            <ChevronDownIcon className="h-4 w-4" />
          </ListboxButton>
          <ListboxOptions
            // non-modal like the chain filter popover, so opening it does not
            // scroll-lock the page and shift the layout
            modal={false}
            anchor={{ to: 'bottom start', gap: 4, padding: 16 }}
            // outline-style none kills the native focus ring on the focused
            // menu; width 0 is ignored for the browser's auto style
            // spans border to divider: button width plus the 10px field padding on the
            // left and the 10px gap on the right, shifted to the field's left edge
            className="z-20 w-[calc(var(--button-width)+20px)] overflow-hidden rounded-[10px] border border-gray-dark bg-gray-1 py-1 text-sm font-light text-white [--anchor-offset:-10px] [outline-style:none]"
          >
            {(Object.keys(searchModeConfig) as TransactionHistorySearchMode[]).map((mode) => (
              <ListboxOption
                key={mode}
                value={mode}
                className="cursor-pointer whitespace-nowrap px-[10px] py-2 data-[focus]:bg-white/10 data-[selected]:bg-white/20"
              >
                {searchModeConfig[mode].label}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
        <div className="h-6 w-px shrink-0 bg-gray-dark" />
        <MagnifyingGlassIcon className="h-4 w-4 shrink-0 opacity-50" />
        <Tooltip
          content={searchModeConfig[searchMode].tooltip}
          wrapperClassName="block h-full w-full"
          contentProps={{
            className: 'w-auto whitespace-normal break-words',
            style: {
              // Limit the tooltip width to 80% of the input width
              maxWidth: 'calc(var(--radix-popper-anchor-width) * 0.8)',
            },
            onPointerDownOutside: (event) => event.preventDefault(),
          }}
        >
          <input
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            // clicking out of the field searches like a submit, including
            // showing the validation error
            onBlur={() => searchTx()}
            inputMode="search"
            placeholder={searchModeConfig[searchMode].placeholder}
            aria-label={
              searchMode === 'txHash'
                ? 'Transaction history transaction hash input'
                : 'Transaction history wallet address input'
            }
            // focus-visible:outline-0 beats the global white input outline; the form shows focus
            className="h-full w-full bg-transparent text-sm font-light tracking-[-0.28px] outline-none focus-visible:outline-0 placeholder:text-white/50"
            // stop password managers from autofilling
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
        </Tooltip>
      </form>
    </div>
  );
}
