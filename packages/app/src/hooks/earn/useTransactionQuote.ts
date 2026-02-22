'use client';

import { useDebounce } from '@uidotdev/usehooks';
import { BigNumber } from 'ethers';
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
  EarnNetwork,
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
  network: EarnNetwork;
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
    network,
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
    network,
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
    network = 'arbitrum',
    rolloverTargetOpportunityId,
    rolloverAmount,
    enabled = true,
  } = params;

  const debouncedAmount = useDebounce(amount, 500);
  const hasPositiveAmount = isPositiveRawAmount(debouncedAmount);

  const { data, error, isLoading, mutate } = useSWRImmutable<TransactionQuoteResponse>(
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
          network,
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
      keyNetwork,
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
            network: keyNetwork,
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
