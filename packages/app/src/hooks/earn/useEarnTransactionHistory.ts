'use client';

import { mutate } from 'swr';
import useSWRImmutable from 'swr/immutable';

import { EarnTransactionHistoryRow } from '@/app-components/earn/EarnTransactionHistoryTable';
import type { OpportunityCategory } from '@/app-types/earn/vaults';
import type {
  EarnNetwork,
  StandardTransactionHistory,
  TransactionHistoryResponse,
  Vendor,
} from '@/earn-api/types';

type UseEarnTransactionHistoryResult = {
  transactions: EarnTransactionHistoryRow[];
  isLoading: boolean;
  error: string | null;
};

type EarnTransactionHistoryKey = readonly [
  'earn-transactions',
  OpportunityCategory,
  string,
  string,
  EarnNetwork,
];

function buildEarnTransactionHistoryKey(
  category: OpportunityCategory,
  opportunityId: string,
  userAddress: string,
  network: EarnNetwork,
): EarnTransactionHistoryKey {
  return ['earn-transactions', category, opportunityId, userAddress, network] as const;
}

/**
 * Hook to fetch transaction history for a specific opportunity
 * User-specific, should invalidate when user makes an earn transaction
 */
export function useEarnTransactionHistory(
  category: OpportunityCategory,
  opportunityId: string,
  userAddress: string | null,
  network: EarnNetwork = 'arbitrum',
): UseEarnTransactionHistoryResult {
  const historyKey =
    userAddress && opportunityId
      ? buildEarnTransactionHistoryKey(category, opportunityId, userAddress, network)
      : null;

  const { data, error, isLoading } = useSWRImmutable<TransactionHistoryResponse>(
    historyKey,
    async ([
      ,
      keyCategory,
      keyOpportunityId,
      keyUserAddress,
      keyNetwork,
    ]: EarnTransactionHistoryKey) => {
      if (!keyUserAddress || !keyOpportunityId) return null;

      const params = new URLSearchParams({
        userAddress: keyUserAddress,
        network: keyNetwork,
      });

      const response = await fetch(
        `/api/onchain-actions/v1/earn/opportunity/${keyCategory}/${keyOpportunityId}/transactions?${params.toString()}`,
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
      assetAmountRaw: tx.assetAmountRaw,
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
  network: EarnNetwork;
  vendor: Vendor;
  transaction: StandardTransactionHistory;
}): Promise<void> {
  const { category, opportunityId, userAddress, network, vendor, transaction } = params;

  const historyKey = buildEarnTransactionHistoryKey(category, opportunityId, userAddress, network);

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
