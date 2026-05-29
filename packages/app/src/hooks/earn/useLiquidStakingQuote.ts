'use client';

import { utils } from 'ethers';
import { useMemo } from 'react';

import type { EarnChainId } from '@/earn-api/types';
import { OpportunityCategory } from '@/earn-api/types';

import { useTransactionQuote } from './useTransactionQuote';

interface UseLiquidStakingQuoteParams {
  opportunityId: string;
  chainId: EarnChainId;
  amount: string;
  userAddress?: string;
  inputTokenAddress?: string;
  outputTokenAddress?: string;
  slippage: number;
  enabled: boolean;
  selectedAction: 'buy' | 'sell';
  selectedSellTokenDecimals?: number;
}

export function useLiquidStakingQuote({
  opportunityId,
  chainId,
  amount,
  userAddress,
  inputTokenAddress,
  outputTokenAddress,
  slippage,
  enabled,
  selectedAction,
  selectedSellTokenDecimals,
}: UseLiquidStakingQuoteParams) {
  const isQuoteActive = enabled && amount !== '0';

  const {
    data: transactionQuote,
    error,
    isLoading,
  } = useTransactionQuote({
    opportunityId,
    category: OpportunityCategory.LiquidStaking,
    chainId,
    action: 'swap',
    amount,
    userAddress,
    inputTokenAddress,
    outputTokenAddress,
    slippage,
    enabled: isQuoteActive,
  });
  const receiveAmountRaw = transactionQuote?.receiveAmount;

  const receiveAmount = useMemo(() => {
    if (!isQuoteActive || !receiveAmountRaw) {
      return null;
    }

    const receiveDecimals = selectedAction === 'sell' ? (selectedSellTokenDecimals ?? 18) : 18;

    try {
      return utils.formatUnits(receiveAmountRaw, receiveDecimals);
    } catch {
      return null;
    }
  }, [isQuoteActive, receiveAmountRaw, selectedAction, selectedSellTokenDecimals]);

  return {
    transactionQuote: isQuoteActive ? transactionQuote : undefined,
    receiveAmount,
    routeError: isQuoteActive ? error : null,
    isLoading: isQuoteActive ? isLoading : false,
  };
}
