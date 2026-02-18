import { mutate } from 'swr';

import { EarnTransactionHistoryRow } from '@/app-components/earn/EarnTransactionHistoryTable';
import {
  getFromLocalStorage,
  saveToLocalStorage,
  useLocalStorageSWR,
} from '@/app-lib/swr/useLocalStorageSWR';
import type { OpportunityCategory } from '@/earn-api/types';
import { StandardTransactionHistory } from '@/earn-api/types';

export interface TransactionHistoryResponse {
  opportunityId: string;
  category: OpportunityCategory;
  vendor: string;
  userAddress: string;
  transactions: StandardTransactionHistory[];
  total: number;
  cachedAt?: number;
  expiresAt?: number;
}

type UseEarnTransactionHistoryResult = {
  transactions: EarnTransactionHistoryRow[];
  isLoading: boolean;
  error: string | null;
};

/**
 * Hook to fetch transaction history for a specific opportunity
 * User-specific, should invalidate when user makes an earn transaction
 *
 * Conservative: 12-24 hours revalidation
 */
export function useEarnTransactionHistory(
  category: OpportunityCategory,
  opportunityId: string,
  userAddress: string | null,
  network: string = 'arbitrum',
): UseEarnTransactionHistoryResult {
  // Conservative: 24 hours, Aggressive: 12 hours
  // Using 12 hours (43200000ms) as default
  const REVALIDATE_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours

  const { data, error, isLoading } = useLocalStorageSWR<TransactionHistoryResponse>(
    userAddress && opportunityId
      ? ([
          'earn-transactions',
          category,
          opportunityId.toLowerCase(),
          userAddress.toLowerCase(),
          network.toLowerCase(),
        ] as const)
      : null,
    async () => {
      if (!userAddress || !opportunityId) return null;

      const params = new URLSearchParams({
        userAddress,
        network,
      });

      const response = await fetch(
        `/api/onchain-actions/v1/earn/opportunity/${category}/${opportunityId}/transactions?${params.toString()}`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `Failed to fetch transaction history: ${response.statusText}`,
        );
      }

      return response.json();
    },
    {
      refreshInterval: REVALIDATE_INTERVAL, // Refetch every 12 hours
      revalidateOnFocus: false,
      revalidateOnReconnect: false, // Don't auto-refetch on reconnect - respect cache
      revalidateIfStale: false, // Don't revalidate if stale - only on interval or manual
      errorRetryCount: 2,
    },
  );

  const transactions: EarnTransactionHistoryRow[] =
    data?.transactions.map((tx: StandardTransactionHistory) => ({
      timestamp: tx.timestamp,
      eventType: tx.eventType,
      assetAmount: tx.assetAmount,
      assetSymbol: tx.assetSymbol,
      assetLogo: tx.assetLogo,
      chainId: tx.chainId,
      chainName: tx.chainName,
      transactionHash: tx.transactionHash,
    })) || [];

  return {
    transactions,
    isLoading,
    error: error?.message || null,
  };
}

/**
 * Utility function to add a transaction to the transaction history cache
 * Performs optimistic update to both SWR cache and localStorage
 *
 * @param params - Parameters for adding transaction to history
 * @returns Promise that resolves when the cache has been updated
 */
export async function addTransactionToHistory(params: {
  category: OpportunityCategory;
  opportunityId: string;
  userAddress: string;
  network: string;
  vendor: string;
  transaction: StandardTransactionHistory;
}): Promise<void> {
  const { category, opportunityId, userAddress, network, vendor, transaction } = params;

  const historyKey = [
    'earn-transactions',
    category,
    opportunityId.toLowerCase(),
    userAddress.toLowerCase(),
    network.toLowerCase(),
  ] as const;

  // Load existing data from localStorage first to ensure we don't overwrite
  const existingData = getFromLocalStorage<TransactionHistoryResponse>(historyKey);

  // Mutate SWR cache with updater function
  // The updater's return value automatically populates the cache
  const updatedData = await mutate(
    historyKey,
    (current: TransactionHistoryResponse | undefined) => {
      // Use existing localStorage data if cache is empty
      const currentData = current || existingData;
      if (!currentData) {
        // If no cache or localStorage exists, create a new response
        return {
          opportunityId,
          category,
          vendor,
          userAddress: userAddress.toLowerCase(),
          transactions: [transaction],
          total: 1,
        };
      }
      // Add new transaction to the beginning of the list
      return {
        ...currentData,
        transactions: [transaction, ...currentData.transactions],
        total: currentData.total + 1,
      };
    },
    {
      revalidate: false, // Don't revalidate - this is an optimistic update
      populateCache: true, // Ensure cache is populated with the updated data
    },
  );

  // Manually save to localStorage after mutation completes
  // This ensures localStorage is updated even if the hook isn't mounted
  // Note: localStorage uses normalized keys (shortened), but SWR cache uses full keys
  // Both work together - SWR matches by full key, localStorage stores with normalized key
  if (updatedData) {
    saveToLocalStorage(historyKey, updatedData);
  }
}
