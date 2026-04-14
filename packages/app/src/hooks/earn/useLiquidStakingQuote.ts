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

  const receiveAmount = useMemo(() => {
    if (!isQuoteActive) {
      return null;
    }

    if (!transactionQuote?.receiveAmount) {
      return null;
    }

    const receiveDecimals = selectedAction === 'sell' ? (selectedSellTokenDecimals ?? 18) : 18;

    try {
      return utils.formatUnits(transactionQuote.receiveAmount, receiveDecimals);
    } catch {
      return null;
    }
  }, [isQuoteActive, transactionQuote?.receiveAmount, selectedAction, selectedSellTokenDecimals]);

  return {
    transactionQuote: isQuoteActive ? transactionQuote : undefined,
    receiveAmount,
    routeError: isQuoteActive ? error : null,
    isLoading: isQuoteActive ? isLoading : false,
  };
}
