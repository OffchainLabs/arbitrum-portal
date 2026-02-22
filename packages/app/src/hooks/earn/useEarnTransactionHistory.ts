import { mutate } from 'swr';
import useSWRImmutable from 'swr/immutable';

import { EarnTransactionHistoryRow } from '@/app-components/earn/EarnTransactionHistoryTable';
import type { OpportunityCategory } from '@/app-types/earn/vaults';
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
 */
export function useEarnTransactionHistory(
  category: OpportunityCategory,
  opportunityId: string,
  userAddress: string | null,
  network: string = 'arbitrum',
): UseEarnTransactionHistoryResult {
  const { data, error, isLoading } = useSWRImmutable<TransactionHistoryResponse>(
    userAddress && opportunityId
      ? (['earn-transactions', category, opportunityId, userAddress, network] as const)
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
      errorRetryCount: 2,
    },
  );

  const transactions: EarnTransactionHistoryRow[] =
    data?.transactions.map((tx: StandardTransactionHistory) => ({
      timestamp: tx.timestamp,
      eventType: tx.eventType,
      assetAmount: tx.assetAmount,
      assetSymbol: tx.assetSymbol,
      decimals: tx.decimals,
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
 * Performs optimistic update to the in-memory SWR cache
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

  const historyKey = ['earn-transactions', category, opportunityId, userAddress, network] as const;

  await mutate(
    historyKey,
    (current: TransactionHistoryResponse | undefined) => {
      if (!current) {
        return {
          opportunityId,
          category,
          vendor,
          userAddress,
          transactions: [transaction],
          total: 1,
        };
      }
      return {
        ...current,
        transactions: [transaction, ...current.transactions],
        total: current.total + 1,
      };
    },
    {
      revalidate: false,
      populateCache: true,
    },
  );
}
