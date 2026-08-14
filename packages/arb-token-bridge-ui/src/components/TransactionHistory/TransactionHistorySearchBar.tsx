import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { Address, isAddress } from 'viem';
import { useAccount } from 'wagmi';
import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

import { Tooltip } from '@/app/components/common/Tooltip';

import { useIsTestnetMode } from '../../hooks/useIsTestnetMode';
import { trackEvent } from '../../util/AnalyticsUtils';
import { isValidTxHash } from '../../util/txHistory/fetchTransactionsByTxHash';
import { Button } from '../common/Button';
import { TransactionHistoryChainFilter } from './TransactionHistoryChainFilter';

export enum TransactionHistorySearchError {
  INVALID_ADDRESS = 'That doesn’t seem to be a valid address, please try again.',
  INVALID_TX_HASH = 'That doesn’t seem to be a valid transaction hash, please try again.',
}

export type TransactionHistorySearchMode = 'address' | 'txHash';

const searchModeConfig: Record<
  TransactionHistorySearchMode,
  { label: string; placeholder: string; tooltip: string }
> = {
  address: {
    label: 'Address',
    placeholder: 'Search any wallet address',
    tooltip:
      'Search any wallet address to view transactions and claim withdrawals for them. The funds will arrive at the destination wallet address specified by the original withdrawal transaction.',
  },
  txHash: {
    label: 'Tx hash',
    placeholder: 'Search any transaction hash',
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
    if (typeof txHash === 'undefined' || isValidTxHash(txHash)) {
      set({ sanitizedTxHash: txHash });
    }
  },
  setSearchMode: (searchMode: TransactionHistorySearchMode) =>
    set({ searchMode, searchError: undefined, sanitizedTxHash: undefined }),
  searchError: undefined,
  setSearchError: (error: TransactionHistorySearchError | undefined) => set({ searchError: error }),
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

export function TransactionHistorySearchBar() {
  const {
    address,
    searchMode,
    setAddress,
    setSanitizedAddress,
    setSanitizedTxHash,
    setSearchMode,
    setSearchError,
  } = useTransactionHistoryAddressStore(
    (state) => ({
      address: state.address,
      searchMode: state.searchMode,
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
      if (connectedAddress) {
        setSanitizedAddress(connectedAddress);
        setSearchError(undefined);
      }
    }
  }, [address, connectedAddress, setSanitizedAddress, setSanitizedTxHash, setSearchError]);

  const searchTx = useCallback(() => {
    const searchInput = address.trim();

    if (searchInput === '') {
      return;
    }

    if (searchMode === 'txHash') {
      if (!isValidTxHash(searchInput)) {
        setSearchError(TransactionHistorySearchError.INVALID_TX_HASH);
        return;
      }

      trackEvent('Search Tx for Tx Hash Click', { isTestnetMode });

      setSanitizedTxHash(searchInput);
      setSearchError(undefined);
      return;
    }

    if (!isAddress(searchInput)) {
      setSearchError(TransactionHistorySearchError.INVALID_ADDRESS);
      return;
    }

    trackEvent('Search Tx for Address Click', {
      isTestnetMode,
      isConnectedAddress: searchInput.toLowerCase() === connectedAddress?.toLowerCase(),
    });

    setSanitizedAddress(searchInput);
    setSearchError(undefined);
  }, [
    address,
    searchMode,
    setSanitizedAddress,
    setSanitizedTxHash,
    setSearchError,
    isTestnetMode,
    connectedAddress,
  ]);

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
          'relative flex w-full items-center justify-center overflow-hidden rounded border border-gray-dark bg-black text-white md:w-1/2',
          'focus-within:ring-2 focus-within:ring-inset focus-within:ring-white',
        )}
        onSubmit={(event) => event.preventDefault()}
      >
        <Listbox value={searchMode} onChange={setSearchMode}>
          <ListboxButton
            className="flex h-full shrink-0 select-none items-center gap-1 border-r border-gray-dark px-2 py-1 text-sm font-light hover:bg-white/20"
            aria-label="Transaction history search mode"
          >
            {searchModeConfig[searchMode].label}
            <ChevronDownIcon className="h-3 w-3" />
          </ListboxButton>
          <ListboxOptions
            // non-modal like the chain filter popover, so opening it does not
            // scroll-lock the page and shift the layout
            modal={false}
            anchor={{ to: 'bottom start', gap: 4, padding: 16 }}
            className="z-20 overflow-hidden rounded border border-gray-dark bg-gray-1 py-1 text-sm font-light text-white"
          >
            {(Object.keys(searchModeConfig) as TransactionHistorySearchMode[]).map((mode) => (
              <ListboxOption
                key={mode}
                value={mode}
                className="cursor-pointer px-3 py-2 data-[focus]:bg-white/10 data-[selected]:bg-white/20"
              >
                {searchModeConfig[mode].label}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
        <MagnifyingGlassIcon className="ml-2 h-3 w-3 shrink-0" />
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
            inputMode="search"
            placeholder={searchModeConfig[searchMode].placeholder}
            aria-label={
              searchMode === 'txHash'
                ? 'Transaction history transaction hash input'
                : 'Transaction history wallet address input'
            }
            // focus-visible:outline-0 beats the global white input outline; the form ring shows focus
            className="h-full w-full bg-transparent py-1 pl-2 pr-3 text-sm font-light outline-none focus-visible:outline-0 placeholder:text-white/60"
            // stop password managers from autofilling
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
        </Tooltip>
        <Button
          type="submit"
          variant="secondary"
          className={twMerge(
            'select-none rounded-l-none border-y-0 border-r-0 border-gray-dark bg-black py-[7px]',
            'hover:bg-white/20 hover:opacity-100',
            'disabled:border-y-0 disabled:border-r-0 disabled:border-l-gray-dark',
          )}
          onClick={searchTx}
          disabled={!address}
        >
          Search
        </Button>
      </form>
    </div>
  );
}
