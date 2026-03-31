'use client';

import { BigNumber, constants, utils } from 'ethers';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useMemo, useState } from 'react';
import { useAccount, useBalance } from 'wagmi';

import { normalizeTokenAddress, sanitizeOutputTokenAddress } from '@/app-lib/earn/utils';
import { OpportunityTableRow } from '@/app-types/earn/vaults';
import { formatAmount, formatUSD, truncateExtraDecimals } from '@/bridge/util/NumberUtils';
import { formatTransactionError, isUserRejectedError } from '@/bridge/util/isUserRejectedError';
import { OpportunityCategory } from '@/earn-api/types';
import type { TransactionStep } from '@/earn-api/types';

import type { TransactionDetails } from '../../components/earn/EarnTransactionDetailsPopup';
import type { EarnTokenOption } from '../../components/earn/earnTokenDropdownOptions';
import { useEarnActionTabs } from './useEarnActionTabs';
import { useEarnGasEstimate } from './useEarnGasEstimate';
import { type TransactionCall, useEarnTransactionExecution } from './useEarnTransactionExecution';
import { useEarnTransactionHistory } from './useEarnTransactionHistory';
import {
  checkAmountExceedsBalance,
  getMaxAmountWithGasBuffer,
  validateTransactionStep,
} from './useEarnTransactionUtils';
import { useEarnTransferReadiness } from './useEarnTransferReadiness';
import { useLiquidStakingQuote } from './useLiquidStakingQuote';
import { useLiquidStakingTokenPrice } from './useLiquidStakingTokenPrice';
import { useLiquidStakingTransactionSuccess } from './useLiquidStakingTransactionSuccess';

type ActionType = 'buy' | 'sell';

const balanceQuery = {
  retry: 2,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  staleTime: 15_000,
} as const;

function getSelectedActionValues({
  selectedAction,
  selectedBuyToken,
  selectedSellToken,
  outputTokenAddress,
  outputTokenSymbol,
  outputTokenIcon,
  ethBalance,
  erc20Balance,
  userBalance,
  isConnected,
}: {
  selectedAction: ActionType;
  selectedBuyToken: EarnTokenOption;
  selectedSellToken: EarnTokenOption;
  outputTokenAddress: string | null;
  outputTokenSymbol: string;
  outputTokenIcon?: string;
  ethBalance: BigNumber | null;
  erc20Balance: BigNumber | null;
  userBalance: BigNumber | null;
  isConnected: boolean;
}) {
  if (selectedAction === 'buy') {
    const isNativeAsset = selectedBuyToken.address === constants.AddressZero;
    return {
      fromTokenAddress: selectedBuyToken.address,
      toTokenAddress: outputTokenAddress,
      selectedTokenAddress: isNativeAsset ? null : selectedBuyToken.address,
      balanceRaw: isConnected
        ? isNativeAsset
          ? ethBalance || BigNumber.from('0')
          : erc20Balance || BigNumber.from('0')
        : BigNumber.from('0'),
      decimals: selectedBuyToken.decimals,
      symbol: selectedBuyToken.symbol,
      logoUrl: selectedBuyToken.logoUrl,
      isNativeAsset,
    };
  }

  return {
    fromTokenAddress: outputTokenAddress,
    toTokenAddress: selectedSellToken.address,
    selectedTokenAddress: null,
    balanceRaw: isConnected ? userBalance || BigNumber.from('0') : BigNumber.from('0'),
    decimals: 18,
    symbol: outputTokenSymbol,
    logoUrl: outputTokenIcon,
    isNativeAsset: false,
  };
}

interface UseLiquidStakingActionPanelStateParams {
  opportunity: OpportunityTableRow;
  initialAction: ActionType;
  selectedBuyTokenDefault: EarnTokenOption;
  selectedSellTokenDefault: EarnTokenOption;
  checkAndShowToS: () => Promise<boolean>;
  showTransactionDetails: (details: TransactionDetails, isCompleted?: boolean) => void;
}

export function useLiquidStakingActionPanelState({
  opportunity,
  initialAction,
  selectedBuyTokenDefault,
  selectedSellTokenDefault,
  checkAndShowToS,
  showTransactionDetails,
}: UseLiquidStakingActionPanelStateParams) {
  const posthog = usePostHog();
  const { address: walletAddress, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [selectedAction, setSelectedAction] = useState<ActionType>(() => initialAction);
  const [selectedBuyToken, setSelectedBuyToken] = useState(selectedBuyTokenDefault);
  const [selectedSellToken, setSelectedSellToken] = useState(selectedSellTokenDefault);
  const [txError, setTxError] = useState<string | null>(null);
  const [slippagePercent, setSlippagePercent] = useState(0.5);

  const outputTokenAddress = sanitizeOutputTokenAddress(opportunity.id);
  const outputTokenSymbol = opportunity.token;
  const requestChainId = opportunity.chainId;
  const { priceUsd: tokenPrice } = useLiquidStakingTokenPrice(outputTokenAddress ?? undefined);
  const { addTransaction } = useEarnTransactionHistory(
    OpportunityCategory.LiquidStaking,
    opportunity.id,
    walletAddress || null,
    requestChainId,
  );

  const { data: userBalanceData, refetch: refetchUserBalance } = useBalance({
    address: walletAddress,
    chainId: requestChainId,
    token: normalizeTokenAddress(outputTokenAddress),
    query: { ...balanceQuery, enabled: isConnected && !!walletAddress },
  });
  const userBalance = userBalanceData ? BigNumber.from(userBalanceData.value.toString()) : null;
  const hasPosition = isConnected && userBalance && userBalance.gt(0);

  const actionTabs = useEarnActionTabs({
    primaryAction: { id: 'buy', label: 'Buy' },
    secondaryAction: { id: 'sell', label: 'Sell' },
    hasSecondaryAction: !!hasPosition,
    selectedAction,
    setSelectedAction: setSelectedAction as (action: string) => void,
  });

  const amountInRawUnits = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) {
      return '0';
    }

    const decimals = selectedAction === 'buy' ? selectedBuyToken.decimals : 18;

    try {
      return utils.parseUnits(truncateExtraDecimals(amount, decimals), decimals).toString();
    } catch {
      return '0';
    }
  }, [amount, selectedAction, selectedBuyToken]);

  const { data: ethBalanceData, refetch: refetchEthBalance } = useBalance({
    address: walletAddress,
    chainId: requestChainId,
    query: { ...balanceQuery, enabled: isConnected && !!walletAddress },
  });
  const ethBalance = ethBalanceData ? BigNumber.from(ethBalanceData.value.toString()) : null;

  const selectedInputTokenValues = useMemo(
    () =>
      getSelectedActionValues({
        selectedAction,
        selectedBuyToken,
        selectedSellToken,
        outputTokenAddress,
        outputTokenSymbol,
        outputTokenIcon: opportunity.tokenIcon,
        ethBalance,
        erc20Balance: null,
        userBalance,
        isConnected,
      }),
    [
      selectedAction,
      selectedBuyToken,
      selectedSellToken,
      outputTokenAddress,
      outputTokenSymbol,
      opportunity.tokenIcon,
      ethBalance,
      userBalance,
      isConnected,
    ],
  );

  const { data: erc20BalanceData, refetch: refetchErc20Balance } = useBalance({
    address: walletAddress,
    chainId: requestChainId,
    token: normalizeTokenAddress(selectedInputTokenValues.selectedTokenAddress),
    query: { ...balanceQuery, enabled: isConnected && !!walletAddress },
  });
  const erc20Balance = erc20BalanceData ? BigNumber.from(erc20BalanceData.value.toString()) : null;

  const currentActionValues = useMemo(
    () =>
      getSelectedActionValues({
        selectedAction,
        selectedBuyToken,
        selectedSellToken,
        outputTokenAddress,
        outputTokenSymbol,
        outputTokenIcon: opportunity.tokenIcon,
        ethBalance,
        erc20Balance,
        userBalance,
        isConnected,
      }),
    [
      selectedAction,
      selectedBuyToken,
      selectedSellToken,
      outputTokenAddress,
      outputTokenSymbol,
      opportunity.tokenIcon,
      ethBalance,
      erc20Balance,
      userBalance,
      isConnected,
    ],
  );

  const amountExceedsBalance = useMemo(
    () =>
      checkAmountExceedsBalance(
        amountInRawUnits,
        currentActionValues.balanceRaw,
        isConnected,
        walletAddress,
      ),
    [amountInRawUnits, currentActionValues.balanceRaw, isConnected, walletAddress],
  );

  const { transactionQuote, receiveAmount, routeError, isLoading } = useLiquidStakingQuote({
    opportunityId: opportunity.id,
    chainId: opportunity.chainId,
    amount: amountInRawUnits,
    userAddress: walletAddress || undefined,
    inputTokenAddress: currentActionValues.fromTokenAddress ?? undefined,
    outputTokenAddress: currentActionValues.toTokenAddress ?? undefined,
    slippage: slippagePercent,
    enabled: amountInRawUnits !== '0' && !amountExceedsBalance,
    selectedAction,
    selectedSellTokenDecimals: selectedSellToken.decimals,
  });

  const currentDecimals = currentActionValues.decimals;
  const currentSymbol = currentActionValues.symbol;

  const transferReadiness = useEarnTransferReadiness({
    amount,
    amountBalance: currentActionValues.balanceRaw,
    amountDecimals: currentDecimals,
    amountSymbol: currentSymbol,
    nativeBalance: ethBalance || undefined,
    chainId: requestChainId,
    transactionSteps: transactionQuote?.transactionSteps,
    apiGasEstimate: transactionQuote?.estimatedGasUsd,
    enabled: isConnected && !!walletAddress,
  });

  const {
    estimate: estimatedTxCostUsd,
    isLoading: isGasEstimateLoading,
    error: gasEstimateError,
  } = useEarnGasEstimate({
    transactionSteps: transactionQuote?.transactionSteps,
    chainId: requestChainId,
    walletAddress: walletAddress || undefined,
    apiEstimate: transactionQuote?.estimatedGasUsd,
    enabled: isConnected && !!walletAddress && !amountExceedsBalance,
  });

  const handleTransactionSuccess = useLiquidStakingTransactionSuccess({
    submittedAmountRaw: amountInRawUnits,
    selectedAction,
    currentSymbol,
    currentDecimals,
    currentActionValues,
    outputTokenSymbol,
    outputTokenIcon: opportunity.tokenIcon,
    selectedSellToken,
    quoteReceiveAmount: transactionQuote?.receiveAmount,
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
    walletAddress: walletAddress || undefined,
    slippagePercent,
    addTransaction,
    showTransactionDetails,
    refetchEthBalance,
    refetchErc20Balance,
    refetchUserBalance,
    resetAmount: () => setAmount(''),
  });

  const buildBatchCalls = useCallback(async (): Promise<TransactionCall[]> => {
    if (!transactionQuote?.transactionSteps || transactionQuote.transactionSteps.length === 0) {
      throw new Error('No transaction steps found');
    }

    return transactionQuote.transactionSteps.map((step: TransactionStep, index: number) => {
      validateTransactionStep(step, index);

      let value: bigint | undefined;
      if (step.value) {
        const valueStr = step.value.toString().toLowerCase().trim();
        const isZero =
          valueStr === '0' ||
          valueStr === '0x0' ||
          valueStr === '0x' ||
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
    buildCalls: buildBatchCalls,
    onTransactionFinished: async ({ txHash }) => {
      await handleTransactionSuccess(txHash);
    },
    inputAmount: amount,
  });

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
  }, [checkAndShowToS, executeTx, transactionQuote, transferReadiness.isReady, walletAddress]);

  const handleMaxClick = () => {
    setAmount(
      getMaxAmountWithGasBuffer({
        balanceRaw: currentActionValues.balanceRaw,
        decimals: currentDecimals,
        isNativeAsset: selectedAction === 'buy' && currentActionValues.isNativeAsset,
        estimatedGasEth: estimatedTxCostUsd?.eth,
      }),
    );
  };

  const resetPanel = () => {
    setAmount('');
    setTxError(null);
  };

  const handleActionChange = useCallback(
    (action: string) => {
      if (action === selectedAction) {
        return;
      }

      setSelectedAction(action as ActionType);
      resetPanel();
      posthog?.capture('Earn Action Selected', {
        page: 'Earn',
        section: 'Action Panel',
        category: OpportunityCategory.LiquidStaking,
        action,
        opportunityId: opportunity.id,
        opportunityName: opportunity.name,
        protocol: opportunity.protocol,
        chainId: requestChainId,
        walletConnected: isConnected,
      });
    },
    [
      isConnected,
      opportunity.id,
      opportunity.name,
      opportunity.protocol,
      posthog,
      requestChainId,
      selectedAction,
    ],
  );

  const handleSlippageChange = (value: number) => {
    if (value === slippagePercent) {
      return;
    }

    setSlippagePercent(value);
    posthog?.capture('Earn Slippage Updated', {
      page: 'Earn',
      section: 'Action Panel',
      category: OpportunityCategory.LiquidStaking,
      action: selectedAction,
      opportunityId: opportunity.id,
      opportunityName: opportunity.name,
      protocol: opportunity.protocol,
      chainId: requestChainId,
      slippagePercent: value,
    });
  };

  const handleBuyTokenSelect = (token: EarnTokenOption) => {
    if (selectedBuyToken.address.toLowerCase() === token.address.toLowerCase()) {
      return;
    }

    setSelectedBuyToken(token);
    posthog?.capture('Earn Input Token Selected', {
      page: 'Earn',
      section: 'Action Panel',
      category: OpportunityCategory.LiquidStaking,
      action: selectedAction,
      opportunityId: opportunity.id,
      opportunityName: opportunity.name,
      protocol: opportunity.protocol,
      chainId: requestChainId,
      tokenSymbol: token.symbol,
      tokenAddress: token.address,
    });
  };

  const handleSellTokenSelect = (token: EarnTokenOption) => {
    if (selectedSellToken.address.toLowerCase() === token.address.toLowerCase()) {
      return;
    }

    setSelectedSellToken(token);
    posthog?.capture('Earn Input Token Selected', {
      page: 'Earn',
      section: 'Action Panel',
      category: OpportunityCategory.LiquidStaking,
      action: selectedAction,
      opportunityId: opportunity.id,
      opportunityName: opportunity.name,
      protocol: opportunity.protocol,
      chainId: requestChainId,
      tokenSymbol: token.symbol,
      tokenAddress: token.address,
    });
  };

  const currentBalanceFormatted = formatAmount(currentActionValues.balanceRaw, {
    decimals: currentDecimals,
    symbol: currentSymbol,
  });
  const currentBalanceAmount = useMemo(
    () => Number(utils.formatUnits(currentActionValues.balanceRaw, currentDecimals)),
    [currentActionValues.balanceRaw, currentDecimals],
  );
  const inputTokenUnitUsd = useMemo(() => {
    if (selectedAction === 'sell') {
      return tokenPrice;
    }

    if (tokenPrice == null || !receiveAmount) {
      return null;
    }

    const inputAmount = Number(amount);
    const receiveAmountNumber = Number(receiveAmount);
    if (!Number.isFinite(inputAmount) || inputAmount <= 0) {
      return null;
    }
    if (!Number.isFinite(receiveAmountNumber) || receiveAmountNumber <= 0) {
      return null;
    }

    return (receiveAmountNumber * tokenPrice) / inputAmount;
  }, [amount, receiveAmount, selectedAction, tokenPrice]);
  const currentUsdValue = useMemo(() => {
    if (inputTokenUnitUsd == null || !Number.isFinite(currentBalanceAmount)) {
      return undefined;
    }

    return currentBalanceAmount * inputTokenUnitUsd;
  }, [currentBalanceAmount, inputTokenUnitUsd]);

  const positionValue = useMemo(() => {
    if (!isConnected || !userBalance || !userBalance.gt(0)) {
      return undefined;
    }

    const balanceInTokens = parseFloat(utils.formatUnits(userBalance, 18));
    return {
      amount: formatAmount(userBalance, {
        decimals: 18,
        symbol: outputTokenSymbol,
      }),
      usdValue:
        tokenPrice !== null && !isNaN(balanceInTokens)
          ? formatUSD(balanceInTokens * tokenPrice)
          : '—',
    };
  }, [isConnected, outputTokenSymbol, tokenPrice, userBalance]);

  const receiveAmountDisplay = useMemo(() => {
    if (!receiveAmount) {
      return amountInRawUnits === '0' ? '' : null;
    }

    const receiveAmountNumber = Number(receiveAmount);
    if (!Number.isFinite(receiveAmountNumber) || receiveAmountNumber <= 0) {
      return null;
    }

    return formatAmount(receiveAmountNumber);
  }, [amountInRawUnits, receiveAmount]);
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
    (isConnected ? routeError?.message : null) ||
    (transferReadiness.errorMessage
      ? typeof transferReadiness.errorMessage === 'string'
        ? transferReadiness.errorMessage
        : String(transferReadiness.errorMessage)
      : null);

  return {
    actionTabs,
    amount,
    amountExceedsBalance,
    currentBalanceAmount,
    currentBalanceFormatted,
    currentSymbol,
    currentUsdValue,
    handleActionChange,
    handleBuyTokenSelect,
    handleMaxClick,
    handleSellTokenSelect,
    handleSlippageChange,
    handleTransaction,
    inputTokenLogoUrl: selectedAction === 'buy' ? selectedBuyToken.logoUrl : opportunity.tokenIcon,
    isConnected,
    isExecuting,
    isLoading,
    isQuoteReady: !!transactionQuote,
    isTransferReadinessLoading: transferReadiness.isLoading,
    outputTokenSymbol,
    positionValue,
    receiveAmountDisplay,
    receiveUsdValue,
    selectedAction,
    selectedBuyToken,
    selectedSellToken,
    setAmount,
    slippagePercent,
    submitDisabled:
      !transferReadiness.isReady || isLoading || !transactionQuote || transferReadiness.isLoading,
    opportunityApy: opportunity.apy,
    estimatedTxCostUsd,
    gasEstimateError,
    isGasEstimateLoading,
    txError,
    validationError,
  };
}
