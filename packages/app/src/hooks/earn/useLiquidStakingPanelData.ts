'use client';

import { BigNumber, utils } from 'ethers';
import { useMemo } from 'react';

import type { OpportunityTableRow } from '@/app-types/earn/vaults';
import { formatAmount, formatUSD } from '@/bridge/util/NumberUtils';

import type { LiquidStakingTokenControl } from '../../components/earn/LiquidStakingTokenSelector';
import type { EarnTokenOption } from '../../components/earn/earnTokenDropdownOptions';
import { getMaxAmountWithGasBuffer } from './useEarnTransactionUtils';
import type { UseEarnTransferReadinessResult } from './useEarnTransferReadiness';
import type { LiquidStakingAction } from './useLiquidStakingPanelControls';

export interface LiquidStakingActionValues {
  balanceRaw: BigNumber;
  decimals: number;
  fromTokenAddress: string | null;
  isNativeAsset: boolean;
  logoUrl?: string;
  selectedTokenAddress: string | null;
  symbol: string;
  toTokenAddress: string | null;
}

interface UseLiquidStakingPanelDataParams {
  opportunity: OpportunityTableRow;
  selectedAction: LiquidStakingAction;
  amount: string;
  selectedBuyToken: EarnTokenOption;
  selectedSellToken: EarnTokenOption;
  swapTokenOptions: EarnTokenOption[];
  onBuyTokenSelect: (token: EarnTokenOption) => void;
  onSellTokenSelect: (token: EarnTokenOption) => void;
  isConnected: boolean;
  hasPosition: boolean;
  hasInputAmount: boolean;
  amountExceedsBalance: boolean;
  hasTransactionQuote: boolean;
  outputTokenSymbol: string;
  currentActionValues: LiquidStakingActionValues;
  userBalance: BigNumber | null;
  tokenPrice: number | null;
  receiveAmount: string | null;
  routeError: Error | null;
  isQuoteLoading: boolean;
  transferReadiness: UseEarnTransferReadinessResult;
  estimatedTxCostUsd: {
    eth: string;
    usd: string | null;
  } | null;
  isGasEstimateLoading: boolean;
  gasEstimateError: Error | null;
}

export function useLiquidStakingPanelData({
  opportunity,
  selectedAction,
  amount,
  selectedBuyToken,
  selectedSellToken,
  swapTokenOptions,
  onBuyTokenSelect,
  onSellTokenSelect,
  isConnected,
  hasPosition,
  hasInputAmount,
  amountExceedsBalance,
  hasTransactionQuote,
  outputTokenSymbol,
  currentActionValues,
  userBalance,
  tokenPrice,
  receiveAmount,
  routeError,
  isQuoteLoading,
  transferReadiness,
  estimatedTxCostUsd,
  isGasEstimateLoading,
  gasEstimateError,
}: UseLiquidStakingPanelDataParams) {
  const currentBalance = formatAmount(currentActionValues.balanceRaw, {
    decimals: currentActionValues.decimals,
    symbol: currentActionValues.symbol,
  });
  const currentBalanceAmount = Number(
    utils.formatUnits(currentActionValues.balanceRaw, currentActionValues.decimals),
  );

  const currentUsdValue = useMemo(() => {
    if (tokenPrice == null) {
      return undefined;
    }

    if (selectedAction === 'sell') {
      return currentBalanceAmount * tokenPrice;
    }

    if (!receiveAmount) {
      return undefined;
    }

    const inputAmount = Number(amount);
    const receiveAmountNumber = Number(receiveAmount);
    if (!Number.isFinite(inputAmount) || inputAmount <= 0) {
      return undefined;
    }
    if (!Number.isFinite(receiveAmountNumber) || receiveAmountNumber <= 0) {
      return undefined;
    }

    return currentBalanceAmount * ((receiveAmountNumber * tokenPrice) / inputAmount);
  }, [amount, currentBalanceAmount, receiveAmount, selectedAction, tokenPrice]);

  const positionValue = useMemo(() => {
    if (!isConnected || !userBalance || !userBalance.gt(0)) {
      return undefined;
    }

    const balanceInTokens = parseFloat(utils.formatUnits(userBalance, 18));
    const fallbackUsdValue =
      typeof opportunity.depositedUsd === 'number' &&
      Number.isFinite(opportunity.depositedUsd) &&
      opportunity.depositedUsd > 0
        ? formatUSD(opportunity.depositedUsd)
        : '—';

    return {
      amount: formatAmount(userBalance, {
        decimals: 18,
        symbol: outputTokenSymbol,
      }),
      usdValue:
        tokenPrice !== null && !Number.isNaN(balanceInTokens)
          ? formatUSD(balanceInTokens * tokenPrice)
          : fallbackUsdValue,
    };
  }, [isConnected, opportunity.depositedUsd, outputTokenSymbol, tokenPrice, userBalance]);

  const receiveAmountDisplay = useMemo(() => {
    if (!receiveAmount) {
      return hasInputAmount ? null : '';
    }

    const receiveAmountNumber = Number(receiveAmount);
    if (!Number.isFinite(receiveAmountNumber) || receiveAmountNumber <= 0) {
      return null;
    }

    return formatAmount(receiveAmountNumber);
  }, [hasInputAmount, receiveAmount]);

  const receiveUsdValue = useMemo(() => {
    if (!receiveAmount || selectedAction !== 'buy' || tokenPrice === null) {
      return undefined;
    }

    const receiveAmountNumber = parseFloat(receiveAmount);
    if (!Number.isFinite(receiveAmountNumber) || receiveAmountNumber <= 0) {
      return undefined;
    }

    return `~${formatUSD(receiveAmountNumber * tokenPrice)}`;
  }, [receiveAmount, selectedAction, tokenPrice]);

  const validationError =
    routeError?.message ||
    (transferReadiness.errorMessage
      ? typeof transferReadiness.errorMessage === 'string'
        ? transferReadiness.errorMessage
        : String(transferReadiness.errorMessage)
      : null);

  const amountTokenControl: LiquidStakingTokenControl =
    selectedAction === 'buy'
      ? {
          type: 'select',
          options: swapTokenOptions,
          selected: selectedBuyToken,
          onSelect: onBuyTokenSelect,
        }
      : {
          type: 'static',
          symbol: outputTokenSymbol,
          logoUrl: opportunity.tokenIcon,
        };

  const receiveTokenControl: LiquidStakingTokenControl | undefined =
    selectedAction === 'sell'
      ? {
          type: 'select',
          options: swapTokenOptions,
          selected: selectedSellToken,
          onSelect: onSellTokenSelect,
        }
      : undefined;

  const handleMaxClick = () =>
    getMaxAmountWithGasBuffer({
      balanceRaw: currentActionValues.balanceRaw,
      decimals: currentActionValues.decimals,
      isNativeAsset: selectedAction === 'buy' && currentActionValues.isNativeAsset,
      estimatedGasEth: estimatedTxCostUsd?.eth,
    });

  return {
    hasPosition,
    positionValue,
    submitDisabled:
      !transferReadiness.isReady ||
      isQuoteLoading ||
      !hasTransactionQuote ||
      transferReadiness.isLoading,
    amountSection: {
      label: selectedAction === 'buy' ? `Swap for ${outputTokenSymbol}` : 'Amount to sell',
      currentBalance,
      currentBalanceAmount,
      currentUsdValue,
      isAmountExceedsBalance: amountExceedsBalance,
      validationError,
      tokenControl: amountTokenControl,
    },
    receiveSection: {
      label: 'You will receive',
      amount: receiveAmountDisplay,
      isLoading: isQuoteLoading,
      token: {
        symbol: selectedAction === 'buy' ? outputTokenSymbol : selectedSellToken.symbol,
        logoUrl: selectedAction === 'buy' ? opportunity.tokenIcon : selectedSellToken.logoUrl,
      },
      tokenControl: receiveTokenControl,
      usdValue: selectedAction === 'buy' ? receiveUsdValue : undefined,
    },
    estimatedTxCostUsd,
    isGasEstimateLoading,
    gasEstimateError,
    handleMaxClick,
  };
}
