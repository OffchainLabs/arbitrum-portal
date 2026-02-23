'use client';

import { mutate } from 'swr';
import useSWRImmutable from 'swr/immutable';

import { EarnTransactionHistoryRow } from '@/app-components/earn/EarnTransactionHistoryTable';
import type { OpportunityCategory } from '@/app-types/earn/vaults';
import { ChainId } from '@/bridge/types/ChainId';
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
};

type EarnTransactionHistoryKey = readonly [
  'earn-transactions',
  OpportunityCategory,
  string,
  string,
  EarnChainId,
];

function buildEarnTransactionHistoryKey(
  category: OpportunityCategory,
  opportunityId: string,
  userAddress: string,
  chainId: EarnChainId,
): EarnTransactionHistoryKey {
  return ['earn-transactions', category, opportunityId, userAddress, chainId] as const;
}

export function useEarnTransactionHistory(
  category: OpportunityCategory,
  opportunityId: string,
  userAddress: string | null,
  chainId: EarnChainId = ChainId.ArbitrumOne,
): UseEarnTransactionHistoryResult {
  const historyKey =
    userAddress && opportunityId
      ? buildEarnTransactionHistoryKey(category, opportunityId, userAddress, chainId)
      : null;

  const { data, error, isLoading } = useSWRImmutable<TransactionHistoryResponse>(
    historyKey,
    async ([
      ,
      keyCategory,
      keyOpportunityId,
      keyUserAddress,
      keyChainId,
    ]: EarnTransactionHistoryKey) => {
      if (!keyUserAddress || !keyOpportunityId) return null;

      const params = new URLSearchParams({
        userAddress: keyUserAddress,
        chainId: String(keyChainId),
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
    data?.transactions
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((tx: StandardTransactionHistory) => ({
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

export async function addTransactionToHistory(params: {
  category: OpportunityCategory;
  opportunityId: string;
  userAddress: string;
  chainId: EarnChainId;
  vendor: Vendor;
  transaction: StandardTransactionHistory;
}): Promise<void> {
  const { category, opportunityId, userAddress, chainId, vendor, transaction } = params;

  const historyKey = buildEarnTransactionHistoryKey(category, opportunityId, userAddress, chainId);

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
}
