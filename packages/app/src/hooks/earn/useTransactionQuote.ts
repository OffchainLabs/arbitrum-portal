import { useEffect, useState } from 'react';
import useSWR from 'swr';

import type { OpportunityCategory } from '@/earn-api/types';

export interface TransactionStep {
  step: number;
  type: 'approval' | 'transaction';
  to: string;
  data: string;
  value?: string;
  chainId: number;
  description?: string;
}

export interface TransactionQuoteResponse {
  opportunityId: string;
  vendor: string;
  action: string;
  canExecute: boolean;
  estimatedGas: string;
  estimatedGasUsd: string;
  receiveAmount?: string;
  receiveAmountFormatted?: string;
  priceImpact?: number;
  transactionSteps: TransactionStep[];
}

export interface UseTransactionQuoteParams {
  opportunityId: string | null;
  category: OpportunityCategory;
  action: 'deposit' | 'redeem' | 'swap' | 'enter' | 'exit' | 'rollover' | 'claim';
  amount: string;
  userAddress: string | null;
  inputTokenAddress?: string;
  outputTokenAddress?: string;
  slippage?: number;
  simulate?: boolean;
  network?: string;
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

  const { data, error, isLoading, mutate } = useSWR<TransactionQuoteResponse>(
    enabled && opportunityId && category && userAddress && debouncedAmount && debouncedAmountNum > 0
      ? [
          'transaction-quote',
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
        ]
      : null,
    async (): Promise<TransactionQuoteResponse> => {
      if (!debouncedAmount || !userAddress) {
        throw new Error('Missing amount or user address');
      }
      const response = await fetch(
        `/api/onchain-actions/v1/earn/opportunity/${category}/${opportunityId}/transaction-quote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category,
            action,
            amount: debouncedAmount,
            userAddress,
            inputTokenAddress,
            outputTokenAddress,
            slippage,
            simulate,
            network,
            rolloverTargetOpportunityId,
            rolloverAmount,
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
