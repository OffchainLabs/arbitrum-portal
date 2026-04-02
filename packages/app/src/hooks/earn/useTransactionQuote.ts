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
  userAddress?: string | null;
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

export function useTransactionQuote({
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
}: UseTransactionQuoteParams): UseTransactionQuoteResult {
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

  return useSWR(
    enabled && opportunityId && hasPositiveAmount
      ? ([
          opportunityId,
          category,
          action,
          debouncedAmount,
          userAddress,
          inputTokenAddress,
          outputTokenAddress,
          slippage,
          simulate,
          chainId,
          rolloverTargetOpportunityId,
          rolloverAmount,
          'transaction-quote',
        ] as const)
      : null,
    async ([
      keyOpportunityId,
      keyCategory,
      keyAction,
      keyDebouncedAmount,
      keyUserAddress,
      keyInputTokenAddress,
      keyOutputTokenAddress,
      keySlippage,
      keySimulate,
      keyChainId,
      keyRolloverTargetOpportunityId,
      keyRolloverAmount,
    ]) => {
      const queryParams = new URLSearchParams({
        action: keyAction,
        amount: keyDebouncedAmount,
        slippage: String(keySlippage),
        simulate: String(keySimulate),
        chainId: String(keyChainId),
      });

      if (keyUserAddress) {
        queryParams.set('userAddress', keyUserAddress);
      }

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
        const errorData = await response.json();
        throw new Error(
          errorData?.message ?? `Failed to get transaction quote: ${response.statusText}`,
        );
      }

      return (await response.json()) as TransactionQuoteResponse;
    },
    {
      refreshInterval: 20_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      keepPreviousData: true,
      errorRetryCount: 2,
    },
  );
}
