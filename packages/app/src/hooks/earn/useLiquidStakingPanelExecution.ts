'use client';

import { useCallback, useState } from 'react';

import type { OpportunityTableRow } from '@/app-types/earn/vaults';
import { formatTransactionError, isUserRejectedError } from '@/bridge/util/isUserRejectedError';
import { OpportunityCategory } from '@/earn-api/types';
import type { TransactionStep } from '@/earn-api/types';

import type { TransactionDetails } from '../../components/earn/EarnTransactionDetailsPopup';
import type { EarnTokenOption } from '../../components/earn/earnTokenDropdownOptions';
import { type TransactionCall, useEarnTransactionExecution } from './useEarnTransactionExecution';
import { useEarnTransactionHistory } from './useEarnTransactionHistory';
import { validateTransactionStep } from './useEarnTransactionUtils';
import type { LiquidStakingAction } from './useLiquidStakingPanelControls';
import { useLiquidStakingTransactionSuccess } from './useLiquidStakingTransactionSuccess';

interface UseLiquidStakingPanelExecutionParams {
  opportunity: OpportunityTableRow;
  selectedAction: LiquidStakingAction;
  selectedSellToken: EarnTokenOption;
  amount: string;
  amountInRawUnits: string;
  currentSymbol: string;
  currentDecimals: number;
  currentActionValues: {
    logoUrl?: string;
    selectedTokenAddress: string | null;
    isNativeAsset: boolean;
  };
  quoteReceiveAmount?: string;
  requestChainId: number;
  estimatedTxCostUsd?: {
    eth?: string | null;
  } | null;
  slippagePercent: number;
  walletAddress?: string;
  isConnected: boolean;
  transactionQuote?: {
    transactionSteps?: TransactionStep[];
    receiveAmount?: string;
  };
  canSubmit: boolean;
  checkAndShowToS: () => Promise<boolean>;
  showTransactionDetails: (details: TransactionDetails, isCompleted?: boolean) => void;
  resetAmount: () => void;
  refetchBalances: {
    refetchEthBalance: () => unknown;
    refetchErc20Balance: () => unknown;
    refetchUserBalance: () => unknown;
  };
}

export function useLiquidStakingPanelExecution({
  opportunity,
  selectedAction,
  selectedSellToken,
  amount,
  amountInRawUnits,
  currentSymbol,
  currentDecimals,
  currentActionValues,
  quoteReceiveAmount,
  requestChainId,
  estimatedTxCostUsd,
  slippagePercent,
  walletAddress,
  isConnected,
  transactionQuote,
  canSubmit,
  checkAndShowToS,
  showTransactionDetails,
  resetAmount,
  refetchBalances,
}: UseLiquidStakingPanelExecutionParams) {
  const [txError, setTxError] = useState<string | null>(null);
  const { addTransaction } = useEarnTransactionHistory(
    OpportunityCategory.LiquidStaking,
    opportunity.id,
    walletAddress || null,
    requestChainId,
  );

  const handleTransactionSuccess = useLiquidStakingTransactionSuccess({
    submittedAmountRaw: amountInRawUnits,
    selectedAction,
    currentSymbol,
    currentDecimals,
    currentActionValues,
    outputTokenSymbol: opportunity.token,
    outputTokenIcon: opportunity.tokenIcon,
    selectedSellToken,
    quoteReceiveAmount: quoteReceiveAmount || transactionQuote?.receiveAmount,
    requestChainId,
    opportunity: {
      id: opportunity.id,
      name: opportunity.name,
      token: opportunity.token,
      tokenIcon: opportunity.tokenIcon,
      protocol: opportunity.protocol,
      protocolIcon: opportunity.protocolIcon,
    },
    estimatedTxCostUsd,
    isConnected,
    walletAddress,
    slippagePercent,
    addTransaction,
    showTransactionDetails,
    refetchEthBalance: refetchBalances.refetchEthBalance,
    refetchErc20Balance: refetchBalances.refetchErc20Balance,
    refetchUserBalance: refetchBalances.refetchUserBalance,
    resetAmount,
  });

  const buildCalls = useCallback(async (): Promise<TransactionCall[]> => {
    if (!transactionQuote?.transactionSteps || transactionQuote.transactionSteps.length === 0) {
      throw new Error('No transaction steps found');
    }

    return transactionQuote.transactionSteps.map((step, index) => {
      validateTransactionStep(step, index);
      let value: bigint | undefined;
      if (step.value) {
        const normalized = step.value.toString().toLowerCase().trim();
        const isZero =
          normalized === '0' ||
          normalized === '0x' ||
          normalized === '0x0' ||
          BigInt(step.value) === BigInt(0);
        value = isZero ? undefined : BigInt(step.value);
      }

      return {
        to: step.to as `0x${string}`,
        data: step.data as `0x${string}`,
        value,
        chainId: step.chainId,
      };
    });
  }, [transactionQuote]);

  const { executeTx, isExecuting } = useEarnTransactionExecution({
    chainId: requestChainId,
    buildCalls,
    onTransactionFinished: async ({ txHash }) => {
      await handleTransactionSuccess(txHash);
    },
    inputAmount: amount,
  });

  const handleTransaction = useCallback(async () => {
    if (!canSubmit || !walletAddress) {
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
  }, [canSubmit, checkAndShowToS, executeTx, walletAddress]);

  return {
    txError,
    clearTxError: () => setTxError(null),
    isExecuting,
    handleTransaction,
  };
}
