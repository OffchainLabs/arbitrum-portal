'use client';

import { usePostHog } from 'posthog-js/react';
import { useCallback } from 'react';

import { getLiquidStakingHistoryValues } from '@/app-lib/earn/utils';
import { OpportunityCategory, type StandardTransactionHistory, Vendor } from '@/earn-api/types';

import type { TransactionDetails } from '../../components/earn/EarnTransactionDetailsPopup';

interface TokenLike {
  symbol: string;
  decimals: number;
  logoUrl?: string;
}

interface CurrentActionValues {
  logoUrl?: string;
  selectedTokenAddress: string | null;
  isNativeAsset: boolean;
}

interface UseLiquidStakingTransactionSuccessParams {
  submittedAmountRaw: string;
  selectedAction: 'buy' | 'sell';
  currentSymbol: string;
  currentDecimals: number;
  currentActionValues: CurrentActionValues;
  outputTokenSymbol: string;
  outputTokenIcon?: string;
  selectedSellToken?: TokenLike;
  quoteReceiveAmount?: string;
  requestChainId: number;
  opportunity: {
    id: string;
    name: string;
    token?: string;
    tokenIcon?: string;
    protocol: string;
    protocolIcon?: string;
  };
  estimatedTxCostUsd?: {
    eth?: string | null;
  } | null;
  isConnected: boolean;
  walletAddress?: string;
  slippagePercent: number;
  addTransaction: (params: {
    vendor: Vendor;
    transaction: StandardTransactionHistory;
  }) => Promise<void>;
  showTransactionDetails: (details: TransactionDetails, isCompleted?: boolean) => void;
  refetchEthBalance: () => unknown;
  refetchErc20Balance: () => unknown;
  refetchUserBalance: () => unknown;
  resetAmount: () => void;
}

export function useLiquidStakingTransactionSuccess({
  submittedAmountRaw,
  selectedAction,
  currentSymbol,
  currentDecimals,
  currentActionValues,
  outputTokenSymbol,
  outputTokenIcon,
  selectedSellToken,
  quoteReceiveAmount,
  requestChainId,
  opportunity,
  estimatedTxCostUsd,
  isConnected,
  walletAddress,
  slippagePercent,
  addTransaction,
  showTransactionDetails,
  refetchEthBalance,
  refetchErc20Balance,
  refetchUserBalance,
  resetAmount,
}: UseLiquidStakingTransactionSuccessParams) {
  const posthog = usePostHog();

  return useCallback(
    async (txHash: string | undefined) => {
      resetAmount();

      if (selectedAction === 'buy' && currentActionValues.isNativeAsset) {
        refetchEthBalance();
      }
      if (selectedAction === 'buy' && currentActionValues.selectedTokenAddress) {
        refetchErc20Balance();
      }
      refetchUserBalance();

      const timestamp = Math.floor(Date.now() / 1000);
      const {
        hasReceiveAmount,
        inputAssetLogo,
        historyAmountRaw,
        historyTokenSymbol,
        historyTokenDecimals,
        historyAssetLogo,
      } = getLiquidStakingHistoryValues({
        selectedAction,
        submittedAmountRaw,
        quoteReceiveAmount,
        currentSymbol,
        currentDecimals,
        currentLogoUrl: currentActionValues.logoUrl,
        outputTokenSymbol,
        outputTokenIcon,
        selectedSellToken,
      });

      const transactionDetails: TransactionDetails = {
        action: selectedAction,
        amount: historyAmountRaw,
        tokenSymbol: historyTokenSymbol,
        decimals: historyTokenDecimals,
        assetLogo: historyAssetLogo,
        chainId: requestChainId,
        txHash,
        timestamp,
        protocolName: opportunity.protocol,
        protocolLogo: opportunity.protocolIcon,
        networkFee:
          estimatedTxCostUsd?.eth && estimatedTxCostUsd.eth !== '—'
            ? { amount: `~${estimatedTxCostUsd.eth} ETH` }
            : undefined,
        opportunityName: opportunity.token || 'Liquid Staking',
      };

      if (txHash) {
        posthog?.capture('Earn Transaction Succeeded', {
          page: 'Earn',
          section: 'Action Panel',
          category: OpportunityCategory.LiquidStaking,
          action: selectedAction,
          opportunityId: opportunity.id,
          opportunityName: opportunity.name,
          protocol: opportunity.protocol,
          chainId: requestChainId,
          transactionHash: txHash,
          walletConnected: isConnected,
          inputToken: currentSymbol,
          inputAmountRaw: submittedAmountRaw,
          outputToken: historyTokenSymbol,
          outputAmountRaw: hasReceiveAmount ? historyAmountRaw : undefined,
          slippagePercent,
        });
      }

      if (walletAddress && txHash) {
        await addTransaction({
          vendor: Vendor.LiFi,
          transaction: {
            timestamp,
            eventType: selectedAction === 'buy' ? 'buy' : 'sell',
            assetAmountRaw: historyAmountRaw,
            assetSymbol: historyTokenSymbol,
            decimals: historyTokenDecimals,
            assetLogo: historyAssetLogo,
            inputAssetAmountRaw: submittedAmountRaw,
            inputAssetSymbol: currentSymbol,
            inputAssetDecimals: currentDecimals,
            inputAssetLogo,
            outputAssetAmountRaw: hasReceiveAmount ? historyAmountRaw : undefined,
            outputAssetSymbol: hasReceiveAmount ? historyTokenSymbol : undefined,
            outputAssetDecimals: hasReceiveAmount ? historyTokenDecimals : undefined,
            outputAssetLogo: hasReceiveAmount ? historyAssetLogo : undefined,
            chainId: requestChainId,
            transactionHash: txHash,
          },
        });
      }

      if (txHash) {
        showTransactionDetails(transactionDetails, true);
      }
    },
    [
      addTransaction,
      currentActionValues,
      currentDecimals,
      currentSymbol,
      estimatedTxCostUsd,
      isConnected,
      opportunity,
      outputTokenIcon,
      outputTokenSymbol,
      posthog,
      quoteReceiveAmount,
      refetchErc20Balance,
      refetchEthBalance,
      refetchUserBalance,
      requestChainId,
      resetAmount,
      selectedAction,
      selectedSellToken,
      showTransactionDetails,
      slippagePercent,
      submittedAmountRaw,
      walletAddress,
    ],
  );
}
