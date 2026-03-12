'use client';

import { useCallback } from 'react';
import useSWRImmutable from 'swr/immutable';

import { EarnTransactionHistoryRow } from '@/app-components/earn/EarnTransactionHistoryTable';
import type { OpportunityCategory } from '@/app-types/earn/vaults';
import { getNetworkName } from '@/bridge/util/networks';
import type {
  EarnChainId,
  StandardTransactionHistory,
  TransactionHistoryResponse,
  Vendor,
} from '@/earn-api/types';

type UseEarnTransactionHistoryResult = {
  transactions: EarnTransactionHistoryRow[];
  isLoading: boolean;
  error: string | null;
  addTransaction: (params: {
    vendor: Vendor;
    transaction: StandardTransactionHistory;
  }) => Promise<void>;
};

export function useEarnTransactionHistory(
  category: OpportunityCategory,
  opportunityId: string,
  userAddress: string | null,
  chainId: EarnChainId,
): UseEarnTransactionHistoryResult {
  const historyKey =
    userAddress && opportunityId
      ? ([category, opportunityId, userAddress, chainId, 'earn-transactions'] as const)
      : null;

  const { data, error, isLoading, mutate } = useSWRImmutable(
    historyKey,
    async ([keyCategory, keyOpportunityId, keyUserAddress, keyChainId]) => {
      const params = new URLSearchParams({
        userAddress: keyUserAddress,
        chainId: String(keyChainId),
      });

      const response = await fetch(
        `/api/onchain-actions/v1/earn/opportunity/${keyCategory}/${keyOpportunityId}/transactions?${params.toString()}`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message ?? `Failed to fetch transaction history: ${response.statusText}`,
        );
      }

      return (await response.json()) as TransactionHistoryResponse;
    },
    {
      errorRetryCount: 2,
    },
  );

  const transactions: EarnTransactionHistoryRow[] = (data?.transactions ?? [])
    .map((tx: StandardTransactionHistory) => ({
      timestamp: tx.timestamp,
      eventType: tx.eventType,
      assetAmountRaw: tx.assetAmountRaw,
      assetSymbol: tx.assetSymbol,
      decimals: tx.decimals,
      assetLogo: tx.assetLogo,
      inputAssetAmountRaw: tx.inputAssetAmountRaw,
      inputAssetSymbol: tx.inputAssetSymbol,
      inputAssetDecimals: tx.inputAssetDecimals,
      inputAssetLogo: tx.inputAssetLogo,
      outputAssetAmountRaw: tx.outputAssetAmountRaw,
      outputAssetSymbol: tx.outputAssetSymbol,
      outputAssetDecimals: tx.outputAssetDecimals,
      outputAssetLogo: tx.outputAssetLogo,
      chainId: tx.chainId,
      chainName: getNetworkName(tx.chainId),
      transactionHash: tx.transactionHash,
    }))
    .sort((a, b) => b.timestamp - a.timestamp);

  const addTransaction = useCallback(
    async (params: { vendor: Vendor; transaction: StandardTransactionHistory }) => {
      const { vendor, transaction } = params;
      await mutate(
        (current) => {
          if (!current) {
            return {
              opportunityId,
              category,
              vendor,
              userAddress: userAddress!,
              transactions: [transaction],
              total: 1,
            };
          }

          const alreadyExists = current.transactions.some(
            (existingTx) =>
              existingTx.transactionHash === transaction.transactionHash &&
              existingTx.eventType === transaction.eventType &&
              existingTx.timestamp === transaction.timestamp,
          );

          if (alreadyExists) {
            return current;
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
    },
    [mutate, opportunityId, category, userAddress],
  );

  return {
    transactions,
    isLoading,
    error: error?.message || null,
    addTransaction,
  };
}
