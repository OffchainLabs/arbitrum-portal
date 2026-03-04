'use client';

import { useDebounce } from '@uidotdev/usehooks';
import { BigNumber } from 'ethers';
import type { SWRResponse } from 'swr';
import useSWR from 'swr';

import type { OpportunityCategory } from '@/app-types/earn/vaults';
import type {
  EarnChainId,
  TransactionQuoteRequest,
  TransactionQuoteResponse,
} from '@/earn-api/types';

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
  chainId: EarnChainId;
  rolloverTargetOpportunityId?: string;
  rolloverAmount?: string;
  enabled?: boolean;
}

export type UseTransactionQuoteResult = SWRResponse<TransactionQuoteResponse, Error>;

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
    chainId,
    rolloverTargetOpportunityId,
    rolloverAmount,
    enabled = true,
  } = params;

  const debouncedAmount = useDebounce(amount, 500);
  const hasPositiveAmount = (() => {
    if (!/^\d+$/.test(debouncedAmount)) {
      return false;
    }

    try {
      return BigNumber.from(debouncedAmount).gt(0);
    } catch {
      return false;
    }
  })();

  const quoteKey =
    enabled && opportunityId && userAddress && hasPositiveAmount
      ? ([
          opportunityId,
          category,
          action,
          userAddress,
          debouncedAmount,
          inputTokenAddress,
          outputTokenAddress,
          slippage,
          simulate,
          chainId,
          rolloverTargetOpportunityId,
          rolloverAmount,
          'transaction-quote',
        ] as const)
      : null;

  return useSWR<TransactionQuoteResponse>(
    quoteKey,
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
      const queryParams = new URLSearchParams({
        action: keyAction,
        amount: keyDebouncedAmount,
        userAddress: keyUserAddress,
        slippage: String(keySlippage),
        simulate: String(keySimulate),
        chainId: String(keyChainId),
      });

      if (keyInputTokenAddress) {
        queryParams.set('inputTokenAddress', keyInputTokenAddress);
      }

      if (keyOutputTokenAddress) {
        queryParams.set('outputTokenAddress', keyOutputTokenAddress);
      }

      if (keyRolloverTargetOpportunityId) {
        queryParams.set('rolloverTargetOpportunityId', keyRolloverTargetOpportunityId);
      }

      if (keyRolloverAmount) {
        queryParams.set('rolloverAmount', keyRolloverAmount);
      }

      const response = await fetch(
        `/api/onchain-actions/v1/earn/opportunity/${keyCategory}/${keyOpportunityId}/transaction-quote?${queryParams.toString()}`,
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
}
