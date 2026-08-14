import useSWR from 'swr';
import { Address } from 'viem';
import { shallow } from 'zustand/shallow';

import { useTransactionHistoryAddressStore } from '../components/TransactionHistory/TransactionHistorySearchBar';
import { useTxHistoryChainFilter } from '../components/TransactionHistory/useTransactionHistoryChainFilter';
import { MergedTransaction } from '../state/app/state';
import { getChainFilterKey, matchesChainFilter } from '../util/chainFilter';
import { isNetwork } from '../util/networks';
import {
  fetchTransactionsByTxHash,
  isValidTxHash,
} from '../util/txHistory/fetchTransactionsByTxHash';
import { getMultiChainFetchList, getTxHistoryRoutes } from '../util/txHistoryRoutes';
import { useIsTestnetMode } from './useIsTestnetMode';
import {
  UseTransactionHistoryResult,
  transformTransaction,
  useTransactionHistory,
} from './useTransactionHistory';

const noop = () => {
  // no pagination in tx hash search
};

/**
 * Fetches bridge transactions matching a transaction hash. Unlike the full
 * address history, this resolves the hash directly from its receipt, so it
 * stays fast on chains where the full history requires long event-log scans
 * (e.g. Edu Chain). Returns the same shape as `useTransactionHistory` so the
 * history table can render either.
 */
export function useTransactionHistoryByTxHash(
  txHash: string | undefined,
): UseTransactionHistoryResult {
  const [isTestnetMode] = useIsTestnetMode();
  // The chain filter constrains the searched chain pairs, same as it
  // constrains the address history fetch. Only its key can go in the SWR key,
  // so the filter object reaches the fetcher via closure.
  const chainFilter = useTxHistoryChainFilter();

  const { data, error, isLoading, mutate } = useSWR(
    isValidTxHash(txHash)
      ? ([
          txHash.toLowerCase(),
          isTestnetMode,
          getChainFilterKey(chainFilter),
          'txHashSearch',
        ] as const)
      : null,
    async ([_txHash, _isTestnetMode]) => {
      const matchesFilter = (chainPair: { parentChainId: number; childChainId: number }) =>
        matchesChainFilter({
          filter: chainFilter,
          sourceChainId: chainPair.parentChainId,
          destinationChainId: chainPair.childChainId,
        });

      const chainPairs = getMultiChainFetchList().filter(
        (chainPair) =>
          matchesFilter(chainPair) &&
          isNetwork(chainPair.parentChainId).isTestnet === _isTestnetMode,
      );

      // The receipt is looked up across every route type (canonical, CCTP,
      // OFT, LiFi), so the probe set is wider than the canonical pairs.
      const probeChainIds = [
        ...new Set(
          getTxHistoryRoutes({ isTestnetMode: _isTestnetMode })
            .filter(matchesFilter)
            .flatMap((chainPair) => [chainPair.parentChainId, chainPair.childChainId]),
        ),
      ];

      const transfers = await fetchTransactionsByTxHash({
        txHash: _txHash,
        chainPairs,
        probeChainIds,
        isTestnetMode: _isTestnetMode,
      });

      const transactions = await Promise.all(
        transfers.map((transfer) => transformTransaction(transfer).catch(() => null)),
      );

      return transactions
        .filter((tx): tx is MergedTransaction => tx !== null)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  return {
    transactions: data ?? [],
    loading: isLoading,
    completed: true,
    error,
    failedChainPairs: [],
    pause: noop,
    resume: noop,
    addPendingTransaction: noop,
    updatePendingTransaction: async () => {
      await mutate();
    },
  };
}

export function useTxHashSearchState() {
  const { searchMode, sanitizedTxHash } = useTransactionHistoryAddressStore(
    (state) => ({
      searchMode: state.searchMode,
      sanitizedTxHash: state.sanitizedTxHash,
    }),
    shallow,
  );

  return {
    isTxHashSearch: searchMode === 'txHash' && typeof sanitizedTxHash !== 'undefined',
    sanitizedTxHash,
  };
}

/**
 * The transaction history currently displayed in the history view: tx hash
 * search results when that mode is active, the address history otherwise.
 * Consumers must use this instead of `useTransactionHistory` inside the
 * history view, so a tx hash search never mounts the full address fetch.
 */
export function useDisplayedTransactionHistory(
  address: Address | undefined,
  { runFetcher = false } = {},
): UseTransactionHistoryResult & { isTxHashSearch: boolean } {
  const { isTxHashSearch, sanitizedTxHash } = useTxHashSearchState();

  const addressHistoryProps = useTransactionHistory(isTxHashSearch ? undefined : address, {
    runFetcher: runFetcher && !isTxHashSearch,
  });
  const txHashHistoryProps = useTransactionHistoryByTxHash(
    isTxHashSearch ? sanitizedTxHash : undefined,
  );

  return {
    ...(isTxHashSearch ? txHashHistoryProps : addressHistoryProps),
    isTxHashSearch,
  };
}
