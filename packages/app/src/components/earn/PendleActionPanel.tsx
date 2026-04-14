'use client';

import { useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';

import { type PendleAction, getPendleSettlementTokens } from '@/app-hooks/earn/pendlePanelUtils';
import type { GasEstimate } from '@/app-hooks/earn/useEarnGasEstimate';
import { usePendlePanelControls } from '@/app-hooks/earn/usePendlePanelControls';
import { usePendlePanelData } from '@/app-hooks/earn/usePendlePanelData';
import { usePendlePanelExecution } from '@/app-hooks/earn/usePendlePanelExecution';
import { Card } from '@/components/Card';
import type { StandardOpportunityFixedYield } from '@/earn-api/types';

import { EarnActionSubmitButton } from './EarnActionPanel/EarnActionSubmitButton';
import { EarnActionTabs } from './EarnActionPanel/EarnActionTabs';
import { EarnAmountInputSection } from './EarnActionPanel/EarnAmountInputSection';
import { EarnErrorDisplay } from './EarnActionPanel/EarnErrorDisplay';
import { EarnGasEstimateDisplay } from './EarnActionPanel/EarnGasEstimateDisplay';
import { EarnPositionValueCard } from './EarnActionPanel/EarnPositionValueCard';
import { EarnReceiveAmountSection } from './EarnActionPanel/EarnReceiveAmountSection';
import {
  EarnTransactionDetailsSection,
  type TransactionDetail,
} from './EarnActionPanel/EarnTransactionDetailsSection';
import type { TransactionDetails } from './EarnTransactionDetailsPopup';
import { TokenSelectorControl } from './LiquidStakingTokenSelector';
import { PendleCapWarning } from './PendleCapWarning';
import { PendleRolloverSection } from './PendleRolloverSection';
import { SlippageSettingsPanel } from './SlippageSettingsPanel';

function PendleTransactionInfo({
  transactionDetails,
  estimatedTxCost,
  isGasEstimateLoading,
  gasEstimateError,
  slippagePercent,
  onSlippageChange,
}: {
  transactionDetails: TransactionDetail[];
  estimatedTxCost: GasEstimate | null;
  isGasEstimateLoading: boolean;
  gasEstimateError: Error | null;
  slippagePercent: number;
  onSlippageChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <EarnTransactionDetailsSection details={transactionDetails} />
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">Transaction Cost</span>
        <span className="text-xs text-white">
          <EarnGasEstimateDisplay
            estimate={estimatedTxCost}
            isLoading={isGasEstimateLoading}
            error={gasEstimateError}
          />
        </span>
      </div>
      <SlippageSettingsPanel
        slippagePercent={slippagePercent}
        onSlippageChange={onSlippageChange}
      />
    </div>
  );
}

interface PendleActionPanelProps {
  opportunity: StandardOpportunityFixedYield;
  initialAction?: PendleAction;
  hidePositionOnMobile?: boolean;
  checkAndShowToS: () => Promise<boolean>;
  showTransactionDetails: (details: TransactionDetails, isCompleted?: boolean) => void;
}

export function PendleActionPanel({
  opportunity,
  initialAction = 'enter',
  hidePositionOnMobile = false,
  checkAndShowToS,
  showTransactionDetails,
}: PendleActionPanelProps) {
  const { address: walletAddress, isConnected } = useAccount();
  const settlementTokens = useMemo(() => getPendleSettlementTokens(opportunity), [opportunity]);
  const controls = usePendlePanelControls({
    opportunity,
    initialAction,
    settlementTokens,
  });
  const {
    amount,
    setAmount,
    selectedAction,
    setSelectedAction,
    selectedInputToken,
    selectedRedeemOutputToken,
    selectedRolloverTargetId,
    setSelectedRolloverTargetId,
    slippagePercent,
    onActionChange,
    onTokenSelect,
    onSlippageChange,
    resetAmount,
  } = controls;
  const data = usePendlePanelData({
    opportunity,
    walletAddress,
    isConnected,
    amount,
    selectedAction,
    selectedInputToken,
    selectedRedeemOutputToken,
    selectedRolloverTargetId,
    slippagePercent,
  });
  const execution = usePendlePanelExecution({
    opportunity,
    walletAddress,
    isConnected,
    selectedAction,
    selectedInputToken,
    quoteAmountRaw: data.quoteAmountRaw,
    transferAmount: data.transferAmount,
    currentInputSymbol: data.currentInputSymbol,
    currentInputDecimals: data.currentInputDecimals,
    outputTokenSymbol: data.outputTokenSymbol,
    outputTokenDecimals: data.outputTokenDecimals,
    outputTokenLogo: data.outputTokenLogo,
    slippagePercent,
    estimatedTxCost: data.estimatedTxCost,
    transactionQuote: data.transactionQuote,
    transferReadiness: data.transferReadiness,
    refetch: data.refetch,
    checkAndShowToS,
    showTransactionDetails,
    resetAmount,
  });
  const { clearTxError, isExecuting, handleTransaction, txError } = execution;
  const isExpiredWithoutPosition =
    data.isMarketExpired && !data.hasManagedPosition && !data.isPositionLoading;

  useEffect(() => {
    if (data.isPositionLoading) {
      return;
    }

    if (!data.hasManagedPosition) {
      if (selectedAction !== 'enter') {
        clearTxError();
        setSelectedAction('enter');
      }
      return;
    }

    if (data.positionState === 'ended') {
      // Matured position: only redeem/rollover
      if (selectedAction !== 'redeem' && selectedAction !== 'rollover') {
        clearTxError();
        setSelectedAction('redeem');
        return;
      }
      if (selectedAction === 'rollover' && !data.isRolloverEnabled) {
        clearTxError();
        setSelectedAction('redeem');
      }
    } else {
      // Active position: allow enter/exit
      if (selectedAction !== 'enter' && selectedAction !== 'exit') {
        clearTxError();
        setSelectedAction('enter');
      }
    }
  }, [
    clearTxError,
    data.hasManagedPosition,
    data.isPositionLoading,
    data.isRolloverEnabled,
    data.positionState,
    selectedAction,
    setSelectedAction,
  ]);

  useEffect(() => {
    if (!data.rolloverTargets.length) {
      setSelectedRolloverTargetId(null);
      return;
    }

    if (
      selectedRolloverTargetId &&
      data.rolloverTargets.some((target) => target.id === selectedRolloverTargetId)
    ) {
      return;
    }

    setSelectedRolloverTargetId(data.rolloverTargets[0]?.id ?? null);
  }, [data.rolloverTargets, selectedRolloverTargetId, setSelectedRolloverTargetId]);

  const transactionDetails = useMemo<TransactionDetail[]>(() => {
    const details: TransactionDetail[] = [
      {
        label: 'Fixed APY',
        value: data.fixedApy != null ? `${data.fixedApy.toFixed(2)}%` : '—',
      },
    ];

    if (data.priceImpact != null) {
      details.push({
        label: 'Price Impact',
        value: `${(data.priceImpact * 100).toFixed(2)}%`,
      });
    }

    return details;
  }, [data.fixedApy, data.priceImpact]);

  const enterTokenControl =
    selectedInputToken != null
      ? {
          type: 'select' as const,
          options: settlementTokens,
          selected: selectedInputToken,
          onSelect: (token: (typeof settlementTokens)[number]) => onTokenSelect(token, 'enter'),
        }
      : null;
  const outputTokenControl =
    selectedRedeemOutputToken != null
      ? {
          type: 'select' as const,
          options: settlementTokens,
          selected: selectedRedeemOutputToken,
          onSelect: (token: (typeof settlementTokens)[number]) =>
            onTokenSelect(token, selectedAction === 'exit' ? 'exit' : 'redeem'),
        }
      : null;
  const ptTokenControl = {
    type: 'static' as const,
    symbol: `PT${data.underlyingAssetSymbol}`,
    logoUrl: data.fixedYield.ptTokenIcon,
  };

  const sharedAmountInputProps = {
    amount,
    onAmountChange: setAmount,
    onMaxClick: () => setAmount(data.handleMaxClick()),
    label: data.amountLabel,
    currentBalance: data.currentBalanceFormatted,
    isAmountExceedsBalance: data.amountExceedsBalance,
    isConnected,
    validationError: data.validationError,
  };

  const sharedReceiveProps = {
    amount: data.receiveAmount,
    isLoading: data.transactionQuoteLoading,
    token: {
      symbol: data.outputTokenSymbol,
      logoUrl: data.outputTokenLogo,
    },
    outputBalance: data.outputBalance,
  };

  const sharedTransactionInfoProps = {
    transactionDetails,
    estimatedTxCost: data.estimatedTxCost,
    isGasEstimateLoading: data.isGasEstimateLoading,
    gasEstimateError: data.gasEstimateError,
    slippagePercent,
    onSlippageChange,
  };

  return (
    <Card className="bg-neutral-50 rounded flex flex-col gap-4 p-4 !overflow-visible">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-white">{data.panelTitle}</h3>
      </div>

      {data.positionValue &&
        (hidePositionOnMobile ? (
          <div className="hidden lg:flex">
            <EarnPositionValueCard positionValue={data.positionValue} />
          </div>
        ) : (
          <EarnPositionValueCard positionValue={data.positionValue} />
        ))}

      {data.actionTabs.length > 0 && (
        <EarnActionTabs
          tabs={data.actionTabs}
          selectedAction={selectedAction}
          onActionChange={(action) => {
            clearTxError();
            onActionChange(action as PendleAction, data.isRolloverEnabled);
          }}
        />
      )}

      {isExpiredWithoutPosition && (
        <div className="rounded-xl border border-white/10 bg-neutral-100 p-4 text-center text-sm text-white/50">
          This market has matured. No new positions can be opened.
        </div>
      )}

      {/* Enter action */}
      {selectedAction === 'enter' && !isExpiredWithoutPosition && (
        <>
          {data.hasDepositCap && (
            <PendleCapWarning
              currentSupply={data.syCurrentSupply}
              supplyCap={data.sySupplyCap || 0}
              isCapReached={data.isCapReached}
              remainingCap={data.remainingCap}
              underlyingAssetSymbol={data.underlyingAssetSymbol}
            />
          )}
          <EarnAmountInputSection
            {...sharedAmountInputProps}
            inputToken={{
              symbol: data.currentInputSymbol,
              logoUrl: selectedInputToken?.logoUrl,
            }}
            inputTokenSelector={
              <TokenSelectorControl control={enterTokenControl ?? ptTokenControl} />
            }
          />
          <EarnReceiveAmountSection label="You will receive" {...sharedReceiveProps} />
          <PendleTransactionInfo {...sharedTransactionInfoProps} />
        </>
      )}

      {/* Exit / Redeem actions */}
      {(selectedAction === 'exit' || selectedAction === 'redeem') && (
        <>
          <EarnAmountInputSection
            {...sharedAmountInputProps}
            inputToken={{
              symbol: data.currentInputSymbol,
              logoUrl: data.fixedYield.ptTokenIcon,
            }}
            inputTokenSelector={<TokenSelectorControl control={ptTokenControl} />}
          />
          {outputTokenControl && (
            <EarnReceiveAmountSection
              label="Receive"
              {...sharedReceiveProps}
              tokenSelector={<TokenSelectorControl control={outputTokenControl} />}
            />
          )}
          {selectedAction === 'exit' && <PendleTransactionInfo {...sharedTransactionInfoProps} />}
        </>
      )}

      {/* Rollover action */}
      {selectedAction === 'rollover' && (
        <PendleRolloverSection
          targets={data.rolloverTargets}
          selectedTargetId={selectedRolloverTargetId}
          onSelect={setSelectedRolloverTargetId}
        />
      )}

      <EarnErrorDisplay
        error={
          txError ||
          data.rolloverError ||
          (selectedAction === 'rollover' ? data.validationError : null)
        }
      />

      {!isExpiredWithoutPosition && (
        <EarnActionSubmitButton
          label={isExecuting ? 'Executing...' : data.submitLabel}
          onClick={handleTransaction}
          isSubmitting={isExecuting}
          disabled={
            selectedAction === 'rollover'
              ? data.transactionQuoteLoading ||
                !data.transactionQuote ||
                !data.selectedRolloverTarget ||
                !data.isRolloverEnabled
              : !data.transferReadiness.isReady ||
                data.transactionQuoteLoading ||
                !data.transactionQuote ||
                data.transferReadiness.isLoading ||
                (selectedAction === 'enter' && data.isCapReached)
          }
          isConnected={isConnected}
        />
      )}
    </Card>
  );
}
