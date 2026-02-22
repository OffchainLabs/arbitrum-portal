'use client';

import { useEffect, useState } from 'react';
import useSWRImmutable from 'swr/immutable';

import type { OpportunityCategory } from '@/app-types/earn/vaults';
import type {
  EarnNetwork,
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
  network?: EarnNetwork;
  rolloverTargetOpportunityId?: string;
  rolloverAmount?: string;
  enabled?: boolean; // Whether to fetch (default: true)
}

export interface UseTransactionQuoteResult {
  data: TransactionQuoteResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Debounce hook to delay API calls until user stops typing
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Unified hook to get transaction quote by opportunity ID and category
 * Replaces useActions, useLiquidStakingSwap, usePendleConvertRoute
 *
 * Returns standardized transaction steps ready for execution
 * Purpose: "How do I execute this?" - Get transaction steps for specific action/amount
 * Note: This hook does NOT execute transactions - execution happens client-side via wagmi
 */
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
    network = 'arbitrum',
    rolloverTargetOpportunityId,
    rolloverAmount,
    enabled = true,
  } = params;

  // Debounce amount to prevent API calls on every keystroke (500ms delay)
  const debouncedAmount = useDebounce(amount, 500);
  const debouncedAmountNum = parseFloat(debouncedAmount);

  const { data, error, isLoading, mutate } = useSWRImmutable<TransactionQuoteResponse>(
    enabled && opportunityId && category && userAddress && debouncedAmount && debouncedAmountNum > 0
      ? [
          opportunityId,
          category,
          action,
          userAddress,
          debouncedAmount,
          inputTokenAddress,
          outputTokenAddress,
          slippage,
          simulate,
          network,
          rolloverTargetOpportunityId,
          rolloverAmount,
          'transaction-quote',
        ]
      : null,
    async (key): Promise<TransactionQuoteResponse> => {
      if (!debouncedAmount || !userAddress) {
        throw new Error('Missing amount or user address');
      }

      const [
        keyOpportunityId,
        keyCategory,
        keyAction,
        keyUserAddress,
        keyDebouncedAmount,
        keyInputTokenAddress,
        keyOutputTokenAddress,
        keySlippage,
        keySimulate,
        keyNetwork,
        keyRolloverTargetOpportunityId,
        keyRolloverAmount,
      ] = key as readonly [
        string,
        OpportunityCategory,
        TransactionQuoteRequest['action'],
        string,
        string,
        string | undefined,
        string | undefined,
        number,
        boolean,
        EarnNetwork,
        string | undefined,
        string | undefined,
        string,
      ];

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
            network: keyNetwork,
            rolloverTargetOpportunityId: keyRolloverTargetOpportunityId,
            rolloverAmount: keyRolloverAmount,
          }),
        },
      );

      if (!response.ok) {
        // Try to parse error response body for detailed error message
        let errorMessage = `Failed to get transaction quote: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData?.error?.message) {
            errorMessage = errorData.error.message;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // If JSON parsing fails, use default error message
        }
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
