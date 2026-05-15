'use client';

import { usePostHog } from 'posthog-js/react';
import { useCallback, useState } from 'react';

import { useEarnTransactionExecution } from '@/app-hooks/earn/useEarnTransactionExecution';
import { useEarnTransactionHistory } from '@/app-hooks/earn/useEarnTransactionHistory';
import { formatTransactionError, isUserRejectedError } from '@/bridge/util/isUserRejectedError';
import { OpportunityCategory, Vendor } from '@/earn-api/types';
import type { StandardOpportunityFixedYield, StandardTransactionHistory } from '@/earn-api/types';

import type { TransactionDetails } from '../../components/earn/EarnTransactionDetailsPopup';
import type { EarnTokenOption } from '../../components/earn/earnTokenDropdownOptions';
import type { PendleAction } from './pendlePanelUtils';

interface UsePendlePanelExecutionParams {
  opportunity: StandardOpportunityFixedYield;
  walletAddress?: string;
  isConnected: boolean;
  selectedAction: PendleAction;
  selectedInputToken: EarnTokenOption | null;
  quoteAmountRaw: string;
  transferAmount: string;
  currentInputSymbol: string;
  currentInputDecimals: number;
  outputTokenSymbol: string;
  outputTokenDecimals: number;
  outputTokenLogo?: string;
  slippagePercent: number;
  estimatedTxCost?: {
    eth: string;
    usd: string | null;
  } | null;
  transactionQuote?: {
    transactionSteps?: {
      step: number;
      type: 'approval' | 'transaction';
      to: string;
      data: string;
      value?: string;
      chainId: number;
      description?: string;
    }[];
    receiveAmount?: string;
  };
  transferReadiness: {
    isReady: boolean;
  };
  refetch: {
    refetchPosition: () => void;
    refetchEnterInputTokenBalance: () => unknown;
    refetchEnterOutputTokenBalance: () => unknown;
    refetchPtInputTokenBalance: () => unknown;
    refetchRedeemOutputTokenBalance: () => unknown;
  };
  checkAndShowToS: () => Promise<boolean>;
  showTransactionDetails: (details: TransactionDetails, isCompleted?: boolean) => void;
  resetAmount: () => void;
}

export function usePendlePanelExecution({
  opportunity,
  walletAddress,
  isConnected,
  selectedAction,
  selectedInputToken,
  quoteAmountRaw,
  transferAmount,
  currentInputSymbol,
  currentInputDecimals,
  outputTokenSymbol,
  outputTokenDecimals,
  outputTokenLogo,
  slippagePercent,
  estimatedTxCost,
  transactionQuote,
  transferReadiness,
  refetch,
  checkAndShowToS,
  showTransactionDetails,
  resetAmount,
}: UsePendlePanelExecutionParams) {
  const posthog = usePostHog();
  const [txError, setTxError] = useState<string | null>(null);
  const { addTransaction } = useEarnTransactionHistory(
    OpportunityCategory.FixedYield,
    opportunity.id,
    walletAddress || null,
    opportunity.chainId,
  );

  const handleTransactionSuccess = useCallback(
    async (txHash: string | undefined) => {
      const submittedAmountRaw = quoteAmountRaw;
      const timestamp = Math.floor(Date.now() / 1000);

      resetAmount();
      refetch.refetchPosition();

      if (selectedAction === 'enter') {
        refetch.refetchEnterInputTokenBalance();
        refetch.refetchEnterOutputTokenBalance();
      } else {
        refetch.refetchPtInputTokenBalance();
        if (selectedAction === 'redeem' || selectedAction === 'exit') {
          refetch.refetchRedeemOutputTokenBalance();
        }
      }

      const quoteReceiveAmount = transactionQuote?.receiveAmount;
      const hasReceiveAmount = quoteReceiveAmount && /^\d+$/.test(quoteReceiveAmount);
      const historyAmountRaw = hasReceiveAmount
        ? quoteReceiveAmount || submittedAmountRaw
        : submittedAmountRaw;
      const inputAssetLogo =
        selectedAction === 'enter'
          ? selectedInputToken?.logoUrl || opportunity.tokenIcon
          : opportunity.fixedYield.ptTokenIcon || opportunity.tokenIcon;
      const historyAssetSymbol = hasReceiveAmount ? outputTokenSymbol : currentInputSymbol;
      const historyAssetDecimals = hasReceiveAmount ? outputTokenDecimals : currentInputDecimals;
      const historyAssetLogo = hasReceiveAmount
        ? outputTokenLogo || opportunity.tokenIcon
        : inputAssetLogo;

      if (walletAddress && txHash) {
        posthog?.capture('Earn Transaction Succeeded', {
          page: 'Earn',
          section: 'Action Panel',
          category: OpportunityCategory.FixedYield,
          action: selectedAction,
          opportunityId: opportunity.id,
          opportunityName: opportunity.name,
          protocol: opportunity.protocol,
          chainId: opportunity.chainId,
          transactionHash: txHash,
          walletConnected: isConnected,
          inputToken: currentInputSymbol,
          inputAmountRaw: submittedAmountRaw,
          outputToken: hasReceiveAmount ? historyAssetSymbol : undefined,
          outputAmountRaw: hasReceiveAmount ? historyAmountRaw : undefined,
          slippagePercent,
        });

        const historyItem: StandardTransactionHistory = {
          timestamp,
          eventType: selectedAction,
          assetAmountRaw: historyAmountRaw,
          assetSymbol: historyAssetSymbol,
          decimals: historyAssetDecimals,
          assetLogo: historyAssetLogo,
          inputAssetAmountRaw: submittedAmountRaw,
          inputAssetSymbol: currentInputSymbol,
          inputAssetDecimals: currentInputDecimals,
          inputAssetLogo,
          outputAssetAmountRaw: hasReceiveAmount ? historyAmountRaw : undefined,
          outputAssetSymbol: hasReceiveAmount ? historyAssetSymbol : undefined,
          outputAssetDecimals: hasReceiveAmount ? historyAssetDecimals : undefined,
          outputAssetLogo: hasReceiveAmount ? historyAssetLogo : undefined,
          chainId: opportunity.chainId,
          transactionHash: txHash,
        };

        await addTransaction({
          vendor: Vendor.Pendle,
          transaction: historyItem,
        });
      }

      if (txHash) {
        showTransactionDetails(
          {
            action: selectedAction,
            amount: historyAmountRaw,
            tokenSymbol: historyAssetSymbol,
            decimals: historyAssetDecimals,
            assetLogo: historyAssetLogo,
            chainId: opportunity.chainId,
            txHash,
            timestamp,
            protocolName: 'Pendle',
            protocolLogo: opportunity.protocolIcon,
            networkFee: estimatedTxCost
              ? {
                  amount: estimatedTxCost.eth,
                  usd: estimatedTxCost.usd ?? '0.00',
                }
              : undefined,
            opportunityName: opportunity.name ?? opportunity.token,
          },
          true,
        );
      }
    },
    [
      addTransaction,
      currentInputDecimals,
      currentInputSymbol,
      estimatedTxCost,
      isConnected,
      opportunity,
      outputTokenDecimals,
      outputTokenLogo,
      outputTokenSymbol,
      posthog,
      quoteAmountRaw,
      refetch,
      resetAmount,
      selectedAction,
      selectedInputToken?.logoUrl,
      showTransactionDetails,
      slippagePercent,
      transactionQuote?.receiveAmount,
      walletAddress,
    ],
  );

  const { executeTx, isExecuting } = useEarnTransactionExecution({
    chainId: opportunity.chainId,
    transactionSteps: transactionQuote?.transactionSteps,
    onTransactionFinished: async ({ txHash }) => {
      await handleTransactionSuccess(txHash);
    },
    inputAmount: transferAmount,
  });

  const clearTxError = useCallback(() => {
    setTxError(null);
  }, []);

  const handleTransaction = useCallback(async () => {
    if (
      !transferReadiness.isReady ||
      !transactionQuote?.transactionSteps ||
      transactionQuote.transactionSteps.length === 0 ||
      !walletAddress
    ) {
      return;
    }

    const tosAccepted = await checkAndShowToS();
    if (!tosAccepted) {
      return;
    }

    setTxError(null);

    try {
      await executeTx();
    } catch (error) {
      if (!isUserRejectedError(error)) {
        setTxError(formatTransactionError(error));
      }
    }
  }, [
    checkAndShowToS,
    executeTx,
    transactionQuote?.transactionSteps,
    transferReadiness.isReady,
    walletAddress,
  ]);

  return {
    txError,
    clearTxError,
    isExecuting,
    handleTransaction,
  };
}
