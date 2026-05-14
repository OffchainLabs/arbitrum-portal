'use client';

import { BigNumber, constants, utils } from 'ethers';
import { useMemo } from 'react';
import { useAccount, useBalance } from 'wagmi';

import { normalizeTokenAddress, sanitizeOutputTokenAddress } from '@/app-lib/earn/utils';
import { OpportunityTableRow } from '@/app-types/earn/vaults';
import { truncateExtraDecimals } from '@/bridge/util/NumberUtils';
import { Card } from '@/components/Card';

import { useEarnActionTabs } from '../../hooks/earn/useEarnActionTabs';
import { useEarnGasEstimate } from '../../hooks/earn/useEarnGasEstimate';
import { checkAmountExceedsBalance } from '../../hooks/earn/useEarnTransactionUtils';
import { useEarnTransferReadiness } from '../../hooks/earn/useEarnTransferReadiness';
import { useLiquidStakingPanelControls } from '../../hooks/earn/useLiquidStakingPanelControls';
import type { LiquidStakingActionValues } from '../../hooks/earn/useLiquidStakingPanelData';
import { useLiquidStakingPanelData } from '../../hooks/earn/useLiquidStakingPanelData';
import { useLiquidStakingPanelExecution } from '../../hooks/earn/useLiquidStakingPanelExecution';
import { useLiquidStakingQuote } from '../../hooks/earn/useLiquidStakingQuote';
import { useLiquidStakingTokenPrice } from '../../hooks/earn/useLiquidStakingTokenPrice';
import { EarnActionSubmitButton } from './EarnActionPanel/EarnActionSubmitButton';
import { EarnActionTabs } from './EarnActionPanel/EarnActionTabs';
import { EarnErrorDisplay } from './EarnActionPanel/EarnErrorDisplay';
import { EarnGasEstimateDisplay } from './EarnActionPanel/EarnGasEstimateDisplay';
import { EarnPositionValueCard } from './EarnActionPanel/EarnPositionValueCard';
import type { TransactionDetails } from './EarnTransactionDetailsPopup';
import { LiquidStakingAmountSection } from './LiquidStakingAmountSection';
import { LiquidStakingReceiveSection } from './LiquidStakingReceiveSection';
import { SlippageSettingsPanel } from './SlippageSettingsPanel';
import {
  ARB_TOKEN_OPTION,
  ETH_TOKEN_OPTION,
  type EarnTokenOption,
  USDC_TOKEN_OPTION,
  USDT_TOKEN_OPTION,
} from './earnTokenDropdownOptions';

interface LiquidStakingActionPanelProps {
  opportunity: OpportunityTableRow;
  initialAction?: 'buy' | 'sell';
  hidePositionOnMobile?: boolean;
  checkAndShowToS: () => Promise<boolean>;
  showTransactionDetails: (details: TransactionDetails, isCompleted?: boolean) => void;
}

const SWAP_TOKEN_OPTIONS = [
  ETH_TOKEN_OPTION,
  USDC_TOKEN_OPTION,
  USDT_TOKEN_OPTION,
  ARB_TOKEN_OPTION,
];

const balanceQuery = {
  retry: 2,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  staleTime: 15_000,
} as const;

function getActionValues({
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
  selectedAction: 'buy' | 'sell';
  selectedBuyToken: EarnTokenOption;
  selectedSellToken: EarnTokenOption;
  outputTokenAddress: string | null;
  outputTokenSymbol: string;
  outputTokenIcon?: string;
  ethBalance: BigNumber | null;
  erc20Balance: BigNumber | null;
  userBalance: BigNumber | null;
  isConnected: boolean;
}): LiquidStakingActionValues {
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

export function LiquidStakingActionPanel({
  opportunity,
  initialAction = 'buy',
  hidePositionOnMobile = false,
  checkAndShowToS,
  showTransactionDetails,
}: LiquidStakingActionPanelProps) {
  const controls = useLiquidStakingPanelControls({
    opportunity,
    initialAction,
  });
  const { address: walletAddress, isConnected } = useAccount();
  const outputTokenAddress = sanitizeOutputTokenAddress(opportunity.id);
  const outputTokenSymbol = opportunity.token;
  const requestChainId = opportunity.chainId;
  const { priceUsd: tokenPrice } = useLiquidStakingTokenPrice(outputTokenAddress ?? undefined);

  const { data: userBalanceData, refetch: refetchUserBalance } = useBalance({
    address: walletAddress,
    chainId: requestChainId,
    token: normalizeTokenAddress(outputTokenAddress),
    query: { ...balanceQuery, enabled: isConnected && !!walletAddress },
  });
  const userBalance = userBalanceData ? BigNumber.from(userBalanceData.value.toString()) : null;
  const hasPosition = isConnected && !!userBalance?.gt(0);

  const amountInRawUnits = useMemo(() => {
    if (!controls.amount || parseFloat(controls.amount) <= 0) {
      return '0';
    }

    const decimals = controls.selectedAction === 'buy' ? controls.selectedBuyToken.decimals : 18;

    try {
      return utils
        .parseUnits(truncateExtraDecimals(controls.amount, decimals), decimals)
        .toString();
    } catch {
      return '0';
    }
  }, [controls.amount, controls.selectedAction, controls.selectedBuyToken.decimals]);

  const { data: ethBalanceData, refetch: refetchEthBalance } = useBalance({
    address: walletAddress,
    chainId: requestChainId,
    query: { ...balanceQuery, enabled: isConnected && !!walletAddress },
  });
  const ethBalance = ethBalanceData ? BigNumber.from(ethBalanceData.value.toString()) : null;

  const selectedTokenAddress =
    controls.selectedAction === 'buy' && controls.selectedBuyToken.address !== constants.AddressZero
      ? controls.selectedBuyToken.address
      : null;

  const { data: erc20BalanceData, refetch: refetchErc20Balance } = useBalance({
    address: walletAddress,
    chainId: requestChainId,
    token: normalizeTokenAddress(selectedTokenAddress),
    query: { ...balanceQuery, enabled: isConnected && !!walletAddress },
  });
  const erc20Balance = erc20BalanceData ? BigNumber.from(erc20BalanceData.value.toString()) : null;

  const currentActionValues = useMemo(
    () =>
      getActionValues({
        selectedAction: controls.selectedAction,
        selectedBuyToken: controls.selectedBuyToken,
        selectedSellToken: controls.selectedSellToken,
        outputTokenAddress,
        outputTokenSymbol,
        outputTokenIcon: opportunity.tokenIcon,
        ethBalance,
        erc20Balance,
        userBalance,
        isConnected,
      }),
    [
      controls.selectedAction,
      controls.selectedBuyToken,
      controls.selectedSellToken,
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
    chainId: requestChainId,
    amount: amountInRawUnits,
    userAddress: walletAddress || undefined,
    inputTokenAddress: currentActionValues.fromTokenAddress ?? undefined,
    outputTokenAddress: currentActionValues.toTokenAddress ?? undefined,
    slippage: controls.slippagePercent,
    enabled: amountInRawUnits !== '0' && !amountExceedsBalance,
    selectedAction: controls.selectedAction,
    selectedSellTokenDecimals: controls.selectedSellToken.decimals,
  });

  const transferReadiness = useEarnTransferReadiness({
    amount: controls.amount,
    amountBalance: currentActionValues.balanceRaw,
    amountDecimals: currentActionValues.decimals,
    amountSymbol: currentActionValues.symbol,
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

  const data = useLiquidStakingPanelData({
    opportunity,
    selectedAction: controls.selectedAction,
    amount: controls.amount,
    onAmountChange: controls.onAmountChange,
    selectedBuyToken: controls.selectedBuyToken,
    selectedSellToken: controls.selectedSellToken,
    swapTokenOptions: SWAP_TOKEN_OPTIONS,
    onBuyTokenSelect: controls.onBuyTokenSelect,
    onSellTokenSelect: controls.onSellTokenSelect,
    isConnected,
    hasPosition,
    hasInputAmount: amountInRawUnits !== '0',
    amountExceedsBalance,
    hasTransactionQuote: !!transactionQuote,
    outputTokenSymbol,
    currentActionValues,
    userBalance,
    tokenPrice,
    receiveAmount,
    routeError: routeError ?? null,
    isQuoteLoading: isLoading,
    transferReadiness,
    estimatedTxCostUsd,
    isGasEstimateLoading,
    gasEstimateError,
  });

  const execution = useLiquidStakingPanelExecution({
    opportunity,
    selectedAction: controls.selectedAction,
    selectedSellToken: controls.selectedSellToken,
    amount: controls.amount,
    amountInRawUnits,
    currentSymbol: currentActionValues.symbol,
    currentDecimals: currentActionValues.decimals,
    currentActionValues,
    quoteReceiveAmount: receiveAmount || undefined,
    requestChainId,
    estimatedTxCostUsd,
    slippagePercent: controls.slippagePercent,
    walletAddress: walletAddress || undefined,
    isConnected,
    transactionQuote,
    canSubmit: !data.submitDisabled,
    checkAndShowToS,
    showTransactionDetails,
    resetAmount: controls.resetAmount,
    refetchBalances: {
      refetchEthBalance,
      refetchErc20Balance,
      refetchUserBalance,
    },
  });

  const actionTabs = useEarnActionTabs({
    primaryAction: { id: 'buy', label: 'Buy' },
    secondaryAction: { id: 'sell', label: 'Sell' },
    hasSecondaryAction: data.hasPosition,
    selectedAction: controls.selectedAction,
    setSelectedAction: controls.onActionChange,
  });

  const handleActionChange = (action: 'buy' | 'sell') => {
    execution.clearTxError();
    controls.onActionChange(action);
  };

  return (
    <Card className="bg-neutral-50 rounded flex flex-col gap-4 p-4 !overflow-visible">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-white">
          {controls.selectedAction === 'buy' ? 'Buy' : 'Sell'} {outputTokenSymbol}
        </h3>
      </div>

      {data.positionValue && (
        <EarnPositionValueCard
          positionValue={data.positionValue}
          className={hidePositionOnMobile ? 'hidden lg:flex' : undefined}
        />
      )}

      <EarnActionTabs
        tabs={actionTabs}
        selectedAction={controls.selectedAction}
        onActionChange={handleActionChange}
      />

      <LiquidStakingAmountSection
        amount={controls.amount}
        onAmountChange={controls.onAmountChange}
        onMaxClick={data.handleMaxClick}
        label={data.amountSection.label}
        currentBalance={data.amountSection.currentBalance}
        currentBalanceAmount={data.amountSection.currentBalanceAmount}
        currentUsdValue={data.amountSection.currentUsdValue}
        isAmountExceedsBalance={data.amountSection.isAmountExceedsBalance}
        isConnected={isConnected}
        validationError={data.amountSection.validationError}
        tokenControl={data.amountSection.tokenControl}
      />

      <LiquidStakingReceiveSection
        label={data.receiveSection.label}
        amount={data.receiveSection.amount}
        isLoading={data.receiveSection.isLoading}
        token={data.receiveSection.token}
        tokenControl={data.receiveSection.tokenControl}
        usdValue={data.receiveSection.usdValue}
      />

      <div className="flex flex-col gap-3">
        <SlippageSettingsPanel
          slippagePercent={controls.slippagePercent}
          onSlippageChange={controls.onSlippageChange}
        />
        <div className="flex flex-col gap-3">
          <div className="flex items-center">
            <span className="text-xs text-white">Transaction Details</span>
          </div>
          {opportunity.apy && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">APY</span>
              <span className="text-xs text-white">{opportunity.apy}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Transaction Cost</span>
            <span className="text-xs text-white">
              <EarnGasEstimateDisplay
                estimate={data.estimatedTxCostUsd}
                isLoading={data.isGasEstimateLoading}
                error={data.gasEstimateError}
              />
            </span>
          </div>
        </div>
      </div>

      <EarnErrorDisplay error={execution.txError} />
      <EarnActionSubmitButton
        label={controls.selectedAction === 'buy' ? 'Buy' : 'Sell'}
        onClick={execution.handleTransaction}
        isSubmitting={execution.isExecuting}
        disabled={data.submitDisabled}
        isConnected={isConnected}
      />
    </Card>
  );
}
