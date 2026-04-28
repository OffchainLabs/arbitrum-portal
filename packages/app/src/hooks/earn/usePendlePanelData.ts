'use client';

import { BigNumber, utils } from 'ethers';
import { useMemo } from 'react';
import { useBalance } from 'wagmi';

import { useAvailableActions } from '@/app-hooks/earn/useAvailableActions';
import { useEarnGasEstimate } from '@/app-hooks/earn/useEarnGasEstimate';
import {
  checkAmountExceedsBalance,
  getMaxAmountWithGasBuffer,
} from '@/app-hooks/earn/useEarnTransactionUtils';
import { useEarnTransferReadiness } from '@/app-hooks/earn/useEarnTransferReadiness';
import { usePendlePosition } from '@/app-hooks/earn/usePendlePosition';
import { useTransactionQuote } from '@/app-hooks/earn/useTransactionQuote';
import { normalizeTokenAddress } from '@/app-lib/earn/utils';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';
import { formatAmount, truncateExtraDecimals } from '@/bridge/util/NumberUtils';
import { extractAddressFromTokenId } from '@/earn-api/lib/pendle';
import { OpportunityCategory } from '@/earn-api/types';
import type { RolloverTarget, StandardOpportunityFixedYield } from '@/earn-api/types';

import type { EarnTokenOption } from '../../components/earn/earnTokenDropdownOptions';
import {
  type PendleAction,
  formatPendleReceiveAmount,
  getPendleUnderlyingSymbol,
} from './pendlePanelUtils';

interface UsePendlePanelDataParams {
  opportunity: StandardOpportunityFixedYield;
  walletAddress?: string;
  isConnected: boolean;
  amount: string;
  selectedAction: PendleAction;
  selectedInputToken: EarnTokenOption | null;
  selectedRedeemOutputToken: EarnTokenOption | null;
  selectedRolloverTargetId: string | null;
  slippagePercent: number;
}

export function usePendlePanelData({
  opportunity,
  walletAddress,
  isConnected,
  amount,
  selectedAction,
  selectedInputToken,
  selectedRedeemOutputToken,
  selectedRolloverTargetId,
  slippagePercent,
}: UsePendlePanelDataParams) {
  const fixedYield = opportunity.fixedYield;
  const chainId = opportunity.chainId;
  const ptTokenAddress = useMemo(() => extractAddressFromTokenId(fixedYield.pt), [fixedYield.pt]);
  const underlyingAssetSymbol = useMemo(
    () => getPendleUnderlyingSymbol(opportunity),
    [opportunity],
  );
  const ptTokenDecimals = fixedYield.ptTokenDecimals ?? 18;
  const underlyingDecimals = fixedYield.underlyingTokenDecimals ?? 18;
  const isMarketExpired = fixedYield.expiry ? new Date() >= new Date(fixedYield.expiry) : false;

  const {
    hasPosition,
    balance: ptPositionBalance,
    state: positionState,
    isLoading: isPositionLoading,
    refetch: refetchPosition,
  } = usePendlePosition(opportunity.id, fixedYield.expiry ?? null, walletAddress, chainId);
  const { data: availableActions } = useAvailableActions({
    opportunityId: opportunity.id,
    category: OpportunityCategory.FixedYield,
    userAddress: walletAddress || null,
    chainId,
  });

  const hasManagedPosition = !!(hasPosition && ptPositionBalance?.gt(0));
  const availableActionIds = useMemo(
    () => new Set(availableActions?.availableActions ?? []),
    [availableActions?.availableActions],
  );
  const rolloverTargets = useMemo(
    () => availableActions?.rolloverTargets ?? [],
    [availableActions?.rolloverTargets],
  );
  const isRolloverEnabled = availableActionIds.has('rollover');
  const selectedRolloverTarget = useMemo<RolloverTarget | null>(
    () => rolloverTargets.find((target) => target.id === selectedRolloverTargetId) ?? null,
    [rolloverTargets, selectedRolloverTargetId],
  );

  const isEnter = selectedAction === 'enter';
  const isExitOrRedeem = selectedAction === 'redeem' || selectedAction === 'exit';
  const ptSymbol = `PT${underlyingAssetSymbol}`;

  const inputTokenAddress = isEnter ? selectedInputToken?.address || null : ptTokenAddress;
  const inputTokenAddressForQuote =
    isEnter && inputTokenAddress && normalizeTokenAddress(inputTokenAddress) === undefined
      ? CommonAddress.ArbitrumOne.WETH
      : inputTokenAddress;
  const outputTokenAddress = isEnter
    ? ptTokenAddress
    : isExitOrRedeem
      ? selectedRedeemOutputToken?.address || null
      : selectedRolloverTarget?.ptTokenAddress || null;

  const balanceQuery = {
    staleTime: 15_000,
    refetchInterval: 20_000,
  } as const;

  const { data: enterInputBalanceData, refetch: refetchEnterInputTokenBalance } = useBalance({
    address: walletAddress as `0x${string}` | undefined,
    chainId,
    token: isEnter ? normalizeTokenAddress(inputTokenAddress) : undefined,
    query: {
      ...balanceQuery,
      enabled: isConnected && isEnter && !!inputTokenAddress,
    },
  });
  const enterInputTokenBalance = enterInputBalanceData
    ? BigNumber.from(enterInputBalanceData.value.toString())
    : null;

  const { data: ptInputBalanceData, refetch: refetchPtInputTokenBalance } = useBalance({
    address: walletAddress as `0x${string}` | undefined,
    chainId,
    token: normalizeTokenAddress(ptTokenAddress),
    query: {
      ...balanceQuery,
      enabled: isConnected && !isEnter && !!ptTokenAddress,
    },
  });
  const ptInputTokenBalance = ptInputBalanceData
    ? BigNumber.from(ptInputBalanceData.value.toString())
    : null;

  const { data: enterOutputBalanceData, refetch: refetchEnterOutputTokenBalance } = useBalance({
    address: walletAddress as `0x${string}` | undefined,
    chainId,
    token: normalizeTokenAddress(ptTokenAddress),
    query: {
      ...balanceQuery,
      enabled: isConnected && isEnter && !!ptTokenAddress,
    },
  });
  const enterOutputTokenBalance = enterOutputBalanceData
    ? BigNumber.from(enterOutputBalanceData.value.toString())
    : null;

  const { data: redeemOutputBalanceData, refetch: refetchRedeemOutputTokenBalance } = useBalance({
    address: walletAddress as `0x${string}` | undefined,
    chainId,
    token: normalizeTokenAddress(selectedRedeemOutputToken?.address ?? null),
    query: {
      ...balanceQuery,
      enabled: isConnected && isExitOrRedeem && !!selectedRedeemOutputToken?.address,
    },
  });
  const redeemOutputTokenBalance = redeemOutputBalanceData
    ? BigNumber.from(redeemOutputBalanceData.value.toString())
    : null;

  const { data: nativeBalanceData } = useBalance({
    address: walletAddress as `0x${string}` | undefined,
    chainId,
    query: { ...balanceQuery, enabled: isConnected && !!walletAddress },
  });
  const nativeBalance = nativeBalanceData
    ? BigNumber.from(nativeBalanceData.value.toString())
    : null;

  const currentInputBalanceRaw = isEnter
    ? (enterInputTokenBalance ?? BigNumber.from(0))
    : (ptInputTokenBalance ?? BigNumber.from(0));
  const currentInputDecimals = isEnter ? (selectedInputToken?.decimals ?? 18) : ptTokenDecimals;
  const currentInputSymbol = isEnter ? selectedInputToken?.symbol || '' : ptSymbol;
  const outputTokenSymbol = isEnter
    ? ptSymbol
    : isExitOrRedeem
      ? selectedRedeemOutputToken?.symbol || underlyingAssetSymbol
      : `PT${selectedRolloverTarget?.tokenSymbol ?? underlyingAssetSymbol}`;
  const outputTokenDecimals = isEnter
    ? ptTokenDecimals
    : isExitOrRedeem
      ? (selectedRedeemOutputToken?.decimals ?? underlyingDecimals)
      : (selectedRolloverTarget?.ptTokenDecimals ?? ptTokenDecimals);
  const outputTokenLogo = isEnter
    ? fixedYield.ptTokenIcon
    : isExitOrRedeem
      ? selectedRedeemOutputToken?.logoUrl
      : selectedRolloverTarget?.ptTokenIcon;

  const amountInRawUnits = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) {
      return '0';
    }

    try {
      return utils
        .parseUnits(truncateExtraDecimals(amount, currentInputDecimals), currentInputDecimals)
        .toString();
    } catch {
      return '0';
    }
  }, [amount, currentInputDecimals]);

  const amountExceedsBalance = useMemo(() => {
    if (selectedAction === 'rollover') {
      return false;
    }

    return checkAmountExceedsBalance(
      amountInRawUnits,
      currentInputBalanceRaw,
      isConnected,
      walletAddress,
    );
  }, [amountInRawUnits, currentInputBalanceRaw, isConnected, selectedAction, walletAddress]);

  const quoteAmountRaw =
    selectedAction === 'rollover' ? (ptPositionBalance?.toString() ?? '0') : amountInRawUnits;
  const transferAmount =
    selectedAction === 'rollover' && ptPositionBalance
      ? utils.formatUnits(ptPositionBalance, ptTokenDecimals)
      : amount;

  const {
    data: transactionQuote,
    isLoading: transactionQuoteLoading,
    error: transactionQuoteError,
  } = useTransactionQuote({
    opportunityId: opportunity.id,
    category: OpportunityCategory.FixedYield,
    chainId,
    action: selectedAction,
    amount: quoteAmountRaw,
    userAddress: walletAddress || null,
    inputTokenAddress: inputTokenAddressForQuote || undefined,
    outputTokenAddress: outputTokenAddress || undefined,
    rolloverTargetOpportunityId: selectedRolloverTarget?.id,
    slippage: slippagePercent,
    enabled:
      selectedAction === 'rollover'
        ? !!walletAddress &&
          !!inputTokenAddressForQuote &&
          !!outputTokenAddress &&
          !!ptPositionBalance?.gt(0) &&
          !!selectedRolloverTarget &&
          isRolloverEnabled
        : !!inputTokenAddressForQuote &&
          !!outputTokenAddress &&
          quoteAmountRaw !== '0' &&
          !!walletAddress &&
          !amountExceedsBalance,
  });

  const transferReadiness = useEarnTransferReadiness({
    amount: transferAmount,
    amountBalance: currentInputBalanceRaw,
    amountDecimals: currentInputDecimals,
    amountSymbol: currentInputSymbol,
    nativeBalance: nativeBalance || undefined,
    chainId,
    transactionSteps: transactionQuote?.transactionSteps,
    apiGasEstimate: transactionQuote?.estimatedGasUsd,
    enabled:
      isConnected &&
      !!walletAddress &&
      (selectedAction !== 'rollover' || (!!selectedRolloverTarget && isRolloverEnabled)),
  });

  const {
    estimate: estimatedTxCost,
    isLoading: isGasEstimateLoading,
    error: gasEstimateError,
  } = useEarnGasEstimate({
    transactionSteps: transactionQuote?.transactionSteps,
    chainId,
    walletAddress: walletAddress || undefined,
    apiEstimate: transactionQuote?.estimatedGasUsd,
    enabled: isConnected && !!walletAddress && !amountExceedsBalance,
  });

  const receiveAmount =
    transactionQuote?.receiveAmount != null
      ? formatPendleReceiveAmount(transactionQuote.receiveAmount, outputTokenDecimals, formatAmount)
      : null;
  const outputBalanceRaw = isEnter
    ? (enterOutputTokenBalance ?? BigNumber.from(0))
    : isExitOrRedeem
      ? (redeemOutputTokenBalance ?? BigNumber.from(0))
      : BigNumber.from(0);
  const outputBalance =
    selectedAction === 'rollover' || !isConnected
      ? undefined
      : formatAmount(outputBalanceRaw, {
          decimals: outputTokenDecimals,
          symbol: outputTokenSymbol,
        });

  const validationError =
    transactionQuoteError?.message ||
    (transferReadiness.errorMessage
      ? typeof transferReadiness.errorMessage === 'string'
        ? transferReadiness.errorMessage
        : String(transferReadiness.errorMessage)
      : null);
  const rolloverError =
    selectedAction === 'rollover' && !rolloverTargets.length
      ? 'No rollover markets are currently available for this position.'
      : null;

  const positionValue = useMemo(() => {
    if (!isConnected || !ptPositionBalance || !ptPositionBalance.gt(0)) {
      return undefined;
    }

    return {
      amount: formatAmount(ptPositionBalance, {
        decimals: ptTokenDecimals,
        symbol: ptSymbol,
      }),
      status: positionState === 'ended' ? 'Maturity Reached' : 'Active',
      label: 'Your Position',
    };
  }, [isConnected, positionState, ptPositionBalance, ptTokenDecimals, ptSymbol]);

  const currentBalanceFormatted = formatAmount(currentInputBalanceRaw, {
    decimals: currentInputDecimals,
    symbol: currentInputSymbol,
  });
  const sySupplyCap = fixedYield.sySupplyCap;
  const syCurrentSupply = fixedYield.syCurrentSupply ?? 0;
  const hasDepositCap = sySupplyCap != null;
  const isCapReached = hasDepositCap && syCurrentSupply >= sySupplyCap;
  const remainingCap = hasDepositCap ? sySupplyCap - syCurrentSupply : null;
  const actionTabs = useMemo(
    () =>
      hasManagedPosition
        ? positionState === 'ended'
          ? [
              { id: 'redeem' as const, label: 'Redeem' },
              { id: 'rollover' as const, label: 'Rollover', disabled: !isRolloverEnabled },
            ]
          : [
              { id: 'enter' as const, label: 'Enter' },
              { id: 'exit' as const, label: 'Exit' },
            ]
        : [],
    [hasManagedPosition, positionState, isRolloverEnabled],
  );

  const refetch = useMemo(
    () => ({
      refetchPosition,
      refetchEnterInputTokenBalance,
      refetchEnterOutputTokenBalance,
      refetchPtInputTokenBalance,
      refetchRedeemOutputTokenBalance,
    }),
    [
      refetchPosition,
      refetchEnterInputTokenBalance,
      refetchEnterOutputTokenBalance,
      refetchPtInputTokenBalance,
      refetchRedeemOutputTokenBalance,
    ],
  );

  return {
    chainId,
    fixedYield,
    ptPositionBalance,
    hasManagedPosition,
    isMarketExpired,
    isPositionLoading,
    positionState,
    positionValue,
    rolloverTargets,
    selectedRolloverTarget,
    isRolloverEnabled,
    actionTabs,
    amountExceedsBalance,
    currentInputBalanceRaw,
    currentInputDecimals,
    currentInputSymbol,
    currentBalanceFormatted,
    outputTokenSymbol,
    outputTokenDecimals,
    outputTokenLogo,
    receiveAmount,
    outputBalance,
    validationError,
    rolloverError,
    transactionQuote,
    transactionQuoteLoading,
    transactionQuoteError,
    transferReadiness,
    estimatedTxCost,
    isGasEstimateLoading,
    gasEstimateError,
    quoteAmountRaw,
    transferAmount,
    hasDepositCap,
    isCapReached,
    remainingCap,
    sySupplyCap,
    syCurrentSupply,
    underlyingAssetSymbol,
    amountLabel:
      selectedAction === 'enter'
        ? 'Amount to enter'
        : selectedAction === 'exit'
          ? 'Amount to exit'
          : selectedAction === 'redeem'
            ? 'Redemption amount'
            : '',
    submitLabel: transactionQuoteLoading
      ? 'Fetching Quote...'
      : selectedAction === 'enter'
        ? 'Enter Position'
        : selectedAction === 'exit'
          ? 'Exit Position'
          : selectedAction === 'redeem'
            ? 'Redeem'
            : 'Rollover',
    panelTitle: hasManagedPosition
      ? positionState === 'ended'
        ? 'Your position'
        : `${underlyingAssetSymbol} Position`
      : `Enter ${underlyingAssetSymbol}`,
    priceImpact: transactionQuote?.priceImpact,
    fixedApy: fixedYield.detailsImpliedApy,
    handleMaxClick: () =>
      getMaxAmountWithGasBuffer({
        balanceRaw: currentInputBalanceRaw,
        decimals: currentInputDecimals,
        isNativeAsset:
          isEnter &&
          !!selectedInputToken?.address &&
          normalizeTokenAddress(selectedInputToken.address) === undefined,
        estimatedGasEth: estimatedTxCost?.eth,
      }),
    refetch,
  };
}
