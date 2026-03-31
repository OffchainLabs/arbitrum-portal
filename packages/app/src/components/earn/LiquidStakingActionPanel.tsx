'use client';

import { useMemo } from 'react';

import { useLiquidStakingActionPanelState } from '@/app-hooks/earn/useLiquidStakingActionPanelState';
import { OpportunityTableRow } from '@/app-types/earn/vaults';
import { Card } from '@/components/Card';

import { EarnActionSubmitButton } from './EarnActionPanel/EarnActionSubmitButton';
import { EarnActionTabs } from './EarnActionPanel/EarnActionTabs';
import { EarnAmountInputSection } from './EarnActionPanel/EarnAmountInputSection';
import { EarnErrorDisplay } from './EarnActionPanel/EarnErrorDisplay';
import { EarnGasEstimateDisplay } from './EarnActionPanel/EarnGasEstimateDisplay';
import { EarnPositionValueCard } from './EarnActionPanel/EarnPositionValueCard';
import { EarnReceiveAmountSection } from './EarnActionPanel/EarnReceiveAmountSection';
import { EarnTransactionDetailsSection } from './EarnActionPanel/EarnTransactionDetailsSection';
import type { TransactionDetails } from './EarnTransactionDetailsPopup';
import {
  LiquidStakingTokenSelector,
  StaticLiquidStakingTokenBadge,
} from './LiquidStakingTokenSelector';
import { SlippageSettingsPanel } from './SlippageSettingsPanel';
import {
  ARB_TOKEN_OPTION,
  ETH_TOKEN_OPTION,
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

export function LiquidStakingActionPanel({
  opportunity,
  initialAction = 'buy',
  hidePositionOnMobile = false,
  checkAndShowToS,
  showTransactionDetails,
}: LiquidStakingActionPanelProps) {
  const {
    actionTabs,
    amount,
    amountExceedsBalance,
    currentBalanceAmount,
    currentBalanceFormatted,
    currentSymbol,
    currentUsdValue,
    estimatedTxCostUsd,
    gasEstimateError,
    handleActionChange,
    handleBuyTokenSelect,
    handleMaxClick,
    handleSellTokenSelect,
    handleSlippageChange,
    handleTransaction,
    inputTokenLogoUrl,
    isConnected,
    isExecuting,
    isGasEstimateLoading,
    isLoading,
    outputTokenSymbol,
    positionValue,
    receiveAmountDisplay,
    receiveUsdValue,
    selectedAction,
    selectedBuyToken,
    selectedSellToken,
    setAmount,
    slippagePercent,
    submitDisabled,
    txError,
    validationError,
    opportunityApy,
  } = useLiquidStakingActionPanelState({
    opportunity,
    initialAction,
    selectedBuyTokenDefault: ETH_TOKEN_OPTION,
    selectedSellTokenDefault: ETH_TOKEN_OPTION,
    checkAndShowToS,
    showTransactionDetails,
  });

  const inputTokenSelector =
    selectedAction === 'buy' ? (
      <LiquidStakingTokenSelector
        options={SWAP_TOKEN_OPTIONS}
        selected={selectedBuyToken}
        onSelect={handleBuyTokenSelect}
      />
    ) : (
      <StaticLiquidStakingTokenBadge symbol={outputTokenSymbol} logoUrl={opportunity.tokenIcon} />
    );

  const receiveTokenSelector =
    selectedAction === 'sell' ? (
      <LiquidStakingTokenSelector
        options={SWAP_TOKEN_OPTIONS}
        selected={selectedSellToken}
        onSelect={handleSellTokenSelect}
      />
    ) : undefined;

  const transactionDetails = useMemo(
    () => [
      ...(opportunityApy ? [{ label: 'APY', value: opportunityApy }] : []),
      {
        label: 'Transaction Cost',
        value: (
          <EarnGasEstimateDisplay
            estimate={estimatedTxCostUsd}
            isLoading={isGasEstimateLoading}
            error={gasEstimateError}
          />
        ),
      },
    ],
    [estimatedTxCostUsd, gasEstimateError, isGasEstimateLoading, opportunityApy],
  );

  return (
    <Card className="bg-neutral-50 rounded flex flex-col gap-4 p-4 !overflow-visible">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-white">
          {selectedAction === 'buy' ? 'Buy' : 'Sell'} {outputTokenSymbol}
        </h3>
      </div>

      {positionValue && (
        <EarnPositionValueCard
          positionValue={positionValue}
          className={hidePositionOnMobile ? 'hidden lg:flex' : undefined}
        />
      )}

      <EarnActionTabs
        tabs={actionTabs}
        selectedAction={selectedAction}
        onActionChange={handleActionChange}
      />

      <EarnAmountInputSection
        amount={amount}
        onAmountChange={setAmount}
        onMaxClick={handleMaxClick}
        label={selectedAction === 'buy' ? `Swap for ${outputTokenSymbol}` : 'Amount to sell'}
        inputToken={{
          symbol: currentSymbol,
          logoUrl: inputTokenLogoUrl,
        }}
        inputTokenSelector={inputTokenSelector}
        currentBalance={currentBalanceFormatted}
        currentBalanceAmount={currentBalanceAmount}
        currentUsdValue={currentUsdValue}
        isAmountExceedsBalance={amountExceedsBalance}
        isConnected={isConnected}
        validationError={validationError}
      />

      <EarnReceiveAmountSection
        label="You will receive"
        amount={receiveAmountDisplay}
        isLoading={isLoading}
        token={{
          symbol: selectedAction === 'buy' ? outputTokenSymbol : selectedSellToken.symbol,
          logoUrl: selectedAction === 'buy' ? opportunity.tokenIcon : selectedSellToken.logoUrl,
        }}
        tokenSelector={receiveTokenSelector}
        usdValue={selectedAction === 'buy' ? receiveUsdValue : undefined}
      />

      <div className="flex flex-col gap-3">
        <SlippageSettingsPanel
          slippagePercent={slippagePercent}
          onSlippageChange={handleSlippageChange}
        />
        <EarnTransactionDetailsSection details={transactionDetails} />
      </div>

      <EarnErrorDisplay error={txError || null} />

      <EarnActionSubmitButton
        label={selectedAction === 'buy' ? 'Buy' : 'Sell'}
        onClick={handleTransaction}
        isSubmitting={isExecuting}
        disabled={submitDisabled}
        isConnected={isConnected}
      />
    </Card>
  );
}
