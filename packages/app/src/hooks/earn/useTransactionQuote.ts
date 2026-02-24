'use client';

import { useDebounce } from '@uidotdev/usehooks';
import { BigNumber } from 'ethers';
import useSWR from 'swr';

import type { OpportunityCategory } from '@/app-types/earn/vaults';
import { ChainId } from '@/bridge/types/ChainId';
import type {
  EarnChainId,
  TransactionQuoteRequest,
  TransactionQuoteResponse,
  TransactionStep,
} from '@/earn-api/types';

export type { TransactionQuoteResponse, TransactionStep };

export interface UseTransactionQuoteParams {
  opportunityId: string | null;
  category: OpportunityCategory;
  action: TransactionQuoteRequest['action'];
  amount: string;
  userAddress: string | null;
  inputTokenAddress?: string;
  outputTokenAddress?: string;
  slippage?: number;
  simulate?: boolean;
  chainId?: EarnChainId;
  rolloverTargetOpportunityId?: string;
  rolloverAmount?: string;
  enabled?: boolean;
}

export interface UseTransactionQuoteResult {
  data: TransactionQuoteResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

type TransactionQuoteKey = readonly [
  string,
  OpportunityCategory,
  TransactionQuoteRequest['action'],
  string,
  string,
  string | undefined,
  string | undefined,
  number,
  boolean,
  EarnChainId,
  string | undefined,
  string | undefined,
  'transaction-quote',
];

function buildTransactionQuoteKey(params: {
  opportunityId: string;
  category: OpportunityCategory;
  action: TransactionQuoteRequest['action'];
  userAddress: string;
  amount: string;
  inputTokenAddress?: string;
  outputTokenAddress?: string;
  slippage: number;
  simulate: boolean;
  chainId: EarnChainId;
  rolloverTargetOpportunityId?: string;
  rolloverAmount?: string;
}): TransactionQuoteKey {
  const {
    opportunityId,
    category,
    action,
    userAddress,
    amount,
    inputTokenAddress,
    outputTokenAddress,
    slippage,
    simulate,
    chainId,
    rolloverTargetOpportunityId,
    rolloverAmount,
  } = params;

  return [
    opportunityId,
    category,
    action,
    userAddress,
    amount,
    inputTokenAddress,
    outputTokenAddress,
    slippage,
    simulate,
    chainId,
    rolloverTargetOpportunityId,
    rolloverAmount,
    'transaction-quote',
  ] as const;
}

function isPositiveRawAmount(rawAmount: string): boolean {
  if (!/^\d+$/.test(rawAmount)) {
    return false;
  }

  try {
    return BigNumber.from(rawAmount).gt(0);
  } catch {
    return false;
  }
}

export function useTransactionQuote(params: UseTransactionQuoteParams): UseTransactionQuoteResult {
  const {
    opportunityId,
    category,
    action,
    amount,
    userAddress,
    inputTokenAddress,
    outputTokenAddress,
    slippage = 0.5,
    simulate = false,
    chainId = ChainId.ArbitrumOne,
    rolloverTargetOpportunityId,
    rolloverAmount,
    enabled = true,
  } = params;

  const debouncedAmount = useDebounce(amount, 500);
  const hasPositiveAmount = isPositiveRawAmount(debouncedAmount);

  const { data, error, isLoading, mutate } = useSWR<TransactionQuoteResponse>(
    enabled && opportunityId && category && userAddress && hasPositiveAmount
      ? buildTransactionQuoteKey({
          opportunityId,
          category,
          action,
          userAddress,
          amount: debouncedAmount,
          inputTokenAddress,
          outputTokenAddress,
          slippage,
          simulate,
          chainId,
          rolloverTargetOpportunityId,
          rolloverAmount,
        })
      : null,
    async ([
      keyOpportunityId,
      keyCategory,
      keyAction,
      keyUserAddress,
      keyDebouncedAmount,
      keyInputTokenAddress,
      keyOutputTokenAddress,
      keySlippage,
      keySimulate,
      keyChainId,
      keyRolloverTargetOpportunityId,
      keyRolloverAmount,
    ]: TransactionQuoteKey): Promise<TransactionQuoteResponse> => {
      const response = await fetch(
        `/api/onchain-actions/v1/earn/opportunity/${keyCategory}/${keyOpportunityId}/transaction-quote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category: keyCategory,
            action: keyAction,
            amount: keyDebouncedAmount,
            userAddress: keyUserAddress,
            inputTokenAddress: keyInputTokenAddress,
            outputTokenAddress: keyOutputTokenAddress,
            slippage: keySlippage,
            simulate: keySimulate,
            chainId: keyChainId,
            rolloverTargetOpportunityId: keyRolloverTargetOpportunityId,
            rolloverAmount: keyRolloverAmount,
          }),
        },
      );

      if (!response.ok) {
        let errorMessage = `Failed to get transaction quote: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData?.error?.message) {
            errorMessage = errorData.error.message;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } catch {}
        throw new Error(errorMessage);
      }

      return (await response.json()) as TransactionQuoteResponse;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
    },
  );

  return {
    data: data ?? null,
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
  };
}
