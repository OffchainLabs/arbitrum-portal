'use client';

import { BigNumber, constants, utils } from 'ethers';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useBalance } from 'wagmi';

import { useAvailableActions } from '@/app-hooks/earn/useAvailableActions';
import { useEarnActionTabs } from '@/app-hooks/earn/useEarnActionTabs';
import { useEarnGasEstimate } from '@/app-hooks/earn/useEarnGasEstimate';
import { useEarnTransactionExecution } from '@/app-hooks/earn/useEarnTransactionExecution';
import { useEarnTransactionHistory } from '@/app-hooks/earn/useEarnTransactionHistory';
import {
  checkAmountExceedsBalance,
  getChainIdFromQuote,
  parseAmountToRawUnits,
} from '@/app-hooks/earn/useEarnTransactionUtils';
import { useEarnTransferReadiness } from '@/app-hooks/earn/useEarnTransferReadiness';
import { useTransactionQuote } from '@/app-hooks/earn/useTransactionQuote';
import {
  deriveVault,
  formatApr,
  getSelectedActionValues,
  normalizeTokenAddress,
} from '@/app-lib/earn/utils';
import { OpportunityCategory } from '@/app-types/earn/vaults';
import { addressesEqual } from '@/bridge/util/AddressUtils';
import { formatAmount, formatUSD } from '@/bridge/util/NumberUtils';
import { formatTransactionError } from '@/bridge/util/isUserRejectedError';
import { Card } from '@/components/Card';
import { type StandardOpportunityLend, Vendor } from '@/earn-api/types';

import { EarnActionSubmitButton } from './EarnActionPanel/EarnActionSubmitButton';
import { EarnActionTabs } from './EarnActionPanel/EarnActionTabs';
import { EarnAmountInputSection } from './EarnActionPanel/EarnAmountInputSection';
import { EarnErrorDisplay } from './EarnActionPanel/EarnErrorDisplay';
import { EarnGasEstimateDisplay } from './EarnActionPanel/EarnGasEstimateDisplay';
import { EarnPositionValueCard } from './EarnActionPanel/EarnPositionValueCard';
import { EarnTransactionDetailsSection } from './EarnActionPanel/EarnTransactionDetailsSection';
import { EarnActionPanelSkeleton } from './EarnActionPanelSkeleton';
import type { TransactionDetails } from './EarnTransactionDetailsPopup';

interface VaultActionPanelProps {
  opportunity: StandardOpportunityLend;
  initialAction?: 'supply' | 'withdraw';
  hidePositionOnMobile?: boolean;
  checkAndShowToS: () => Promise<boolean>;
  showTransactionDetails: (details: TransactionDetails, isCompleted?: boolean) => void;
}

type ActionType = 'supply' | 'withdraw';

export function VaultActionPanel({
  opportunity,
  initialAction = 'supply',
  hidePositionOnMobile = false,
  checkAndShowToS,
  showTransactionDetails,
}: VaultActionPanelProps) {
  const posthog = usePostHog();
  const vault = useMemo(() => deriveVault(opportunity), [opportunity]);
  const { address: walletAddress, isConnected } = useAccount();

  const [amount, setAmount] = useState('');
  const [selectedAction, setSelectedAction] = useState<ActionType>(initialAction);
  const [txError, setTxError] = useState<string | null>(null);
  const requestChainId = vault.chainId;

  useEffect(() => {
    setAmount('');
    setTxError(null);
  }, [selectedAction]);

  const { addTransaction } = useEarnTransactionHistory(
    OpportunityCategory.Lend,
    vault.address,
    walletAddress || null,
    requestChainId,
  );

  const { data: availableActions, isLoading: contextLoading } = useAvailableActions({
    opportunityId: vault.address,
    category: OpportunityCategory.Lend,
    userAddress: walletAddress || null,
    chainId: requestChainId,
  });

  const transactionContext = availableActions?.transactionContext;
  const asset = transactionContext?.asset;
  const lpToken = transactionContext?.lpToken;

  const networkChainId = requestChainId;
  const canFetchBalance = isConnected && !!walletAddress;

  const assetTokenAddress = asset?.address ?? vault.asset?.address ?? null;
  const lpTokenAddress = lpToken?.address ?? null;
  const isNativeAsset =
    !assetTokenAddress || addressesEqual(assetTokenAddress, constants.AddressZero);
  const normalizedAssetToken = isNativeAsset ? undefined : normalizeTokenAddress(assetTokenAddress);
  const normalizedLpToken = normalizeTokenAddress(lpTokenAddress);

  const balanceQuery = {
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 15_000,
  } as const;

  const { data: assetBalanceData, refetch: refetchAssetBalance } = useBalance({
    address: walletAddress,
    chainId: networkChainId,
    token: normalizedAssetToken,
    query: {
      ...balanceQuery,
      enabled: canFetchBalance && (isNativeAsset || !!normalizedAssetToken),
    },
  });

  const { data: lpTokenBalanceData, refetch: refetchLpTokenBalance } = useBalance({
    address: walletAddress,
    chainId: networkChainId,
    token: normalizedLpToken,
    query: { ...balanceQuery, enabled: canFetchBalance && !!normalizedLpToken },
  });

  const assetBalance = {
    balanceRaw: assetBalanceData
      ? BigNumber.from(assetBalanceData.value.toString())
      : BigNumber.from(asset?.balanceNative ?? '0'),
    decimals: assetBalanceData?.decimals ?? asset?.decimals ?? 18,
    balanceUsd: asset?.balanceUsd,
  };
  const lpTokenBalance = {
    balanceRaw: lpTokenBalanceData
      ? BigNumber.from(lpTokenBalanceData.value.toString())
      : BigNumber.from(lpToken?.balanceNative ?? '0'),
    decimals: lpTokenBalanceData?.decimals ?? lpToken?.decimals ?? 18,
    balanceUsd: lpToken?.balanceUsd,
  };
  const assetSymbol = assetBalanceData?.symbol ?? asset?.symbol ?? vault.asset?.symbol;

  const amountInRawUnits = parseAmountToRawUnits(
    amount,
    selectedAction,
    assetBalance.decimals,
    lpTokenBalance.decimals,
  );

  const selectedActionValues = getSelectedActionValues(
    selectedAction,
    assetBalance,
    lpTokenBalance,
  );

  const amountExceedsBalance = useMemo(
    () =>
      checkAmountExceedsBalance(
        amountInRawUnits,
        selectedActionValues.balanceRaw,
        isConnected,
        walletAddress,
      ),
    [amountInRawUnits, selectedActionValues.balanceRaw, isConnected, walletAddress],
  );

  const {
    data: transactionQuote,
    isLoading: transactionQuoteLoading,
    error: transactionQuoteError,
  } = useTransactionQuote({
    opportunityId: vault.address,
    category: OpportunityCategory.Lend,
    action: selectedAction === 'supply' ? 'deposit' : 'redeem',
    amount: amountInRawUnits,
    userAddress: walletAddress || null,
    inputTokenAddress:
      selectedAction === 'supply' ? asset?.address || vault.asset?.address : vault.asset?.address,
    chainId: requestChainId,
    enabled: amountInRawUnits !== '0' && (!isConnected || !amountExceedsBalance),
  });

  const chainId = useMemo(
    () => getChainIdFromQuote(transactionQuote?.transactionSteps),
    [transactionQuote],
  );
  const fallbackChainIdFromQuote = chainId || networkChainId;

  const shouldFetchNativeBalance = canFetchBalance && chainId !== 0;
  const { data: nativeBalanceData } = useBalance({
    address: shouldFetchNativeBalance ? walletAddress : undefined,
    chainId: fallbackChainIdFromQuote || networkChainId,
    query: { ...balanceQuery, enabled: shouldFetchNativeBalance },
  });
  const nativeBalance = nativeBalanceData
    ? BigNumber.from(nativeBalanceData.value.toString())
    : null;

  const {
    estimate: estimatedTxCostUsd,
    isLoading: isGasEstimateLoading,
    error: gasEstimateError,
  } = useEarnGasEstimate({
    transactionSteps: transactionQuote?.transactionSteps,
    chainId,
    walletAddress: walletAddress || undefined,
    apiEstimate: transactionQuote?.estimatedGasUsd,
    enabled: isConnected && !!walletAddress && chainId !== 0 && !amountExceedsBalance,
  });

  const onTransactionFinished = useCallback(
    async ({ txHash }: { txHash: string | undefined }) => {
      setAmount('');
      refetchAssetBalance();
      refetchLpTokenBalance();

      if (
        !transactionQuote?.transactionDetailsTemplate ||
        !transactionQuote.pendingHistoryTemplate
      ) {
        return;
      }

      const { transactionDetailsTemplate, pendingHistoryTemplate } = transactionQuote;
      const timestamp = Math.floor(Date.now() / 1000);

      if (txHash) {
        const historyRecord = { ...pendingHistoryTemplate, timestamp, transactionHash: txHash };

        posthog?.capture('Earn Transaction Succeeded', {
          page: 'Earn',
          section: 'Action Panel',
          category: OpportunityCategory.Lend,
          action: selectedAction,
          opportunityId: vault.address,
          opportunityName: transactionDetailsTemplate.opportunityName ?? vault.name,
          protocol: transactionDetailsTemplate.protocolName ?? vault.protocol?.name,
          chainId: vault.chainId,
          transactionHash: txHash,
          inputToken: historyRecord.inputAssetSymbol ?? transactionDetailsTemplate.tokenSymbol,
          inputAmountRaw: historyRecord.inputAssetAmountRaw ?? amountInRawUnits,
          outputToken: historyRecord.outputAssetSymbol,
          outputAmountRaw: historyRecord.outputAssetAmountRaw,
          walletConnected: isConnected,
        });

        if (walletAddress) {
          await addTransaction({
            vendor: Vendor.Vaults,
            transaction: historyRecord,
          });
        }
      }

      const networkFee =
        estimatedTxCostUsd?.eth && estimatedTxCostUsd.eth !== '—'
          ? { amount: `~${estimatedTxCostUsd.eth} ETH` }
          : undefined;

      showTransactionDetails(
        {
          action: selectedAction === 'supply' ? 'supply' : 'withdraw',
          ...transactionDetailsTemplate,
          txHash: txHash ?? '',
          timestamp,
          networkFee,
        },
        true,
      );
    },
    [
      addTransaction,
      amountInRawUnits,
      estimatedTxCostUsd,
      isConnected,
      posthog,
      refetchAssetBalance,
      refetchLpTokenBalance,
      selectedAction,
      showTransactionDetails,
      transactionQuote,
      vault.address,
      vault.chainId,
      vault.name,
      vault.protocol?.name,
      walletAddress,
    ],
  );

  const { executeTx, isExecuting } = useEarnTransactionExecution({
    chainId,
    transactionSteps: transactionQuote?.transactionSteps,
    onTransactionFinished,
    inputAmount: amount,
  });

  const hasRedeem = availableActions?.availableActions?.includes('redeem') ?? false;

  const hasPosition = lpTokenBalance.balanceRaw.gt(0);

  const actionTabs = useEarnActionTabs({
    primaryAction: { id: 'supply', label: 'Supply' },
    secondaryAction: { id: 'withdraw', label: 'Withdraw' },
    hasSecondaryAction: hasRedeem && hasPosition,
    selectedAction,
    setSelectedAction: setSelectedAction as (action: string) => void,
  });

  const handleActionChange = useCallback(
    (action: string) => {
      if (action === selectedAction) return;
      setSelectedAction(action as ActionType);
      setAmount('');
      setTxError(null);
      posthog?.capture('Earn Action Selected', {
        page: 'Earn',
        section: 'Action Panel',
        category: OpportunityCategory.Lend,
        action,
        opportunityId: vault.address,
        opportunityName: vault.name,
        protocol: vault.protocol?.name,
        chainId: requestChainId,
      });
    },
    [posthog, requestChainId, selectedAction, vault.address, vault.name, vault.protocol],
  );

  const currentApr = formatApr(vault.apy);

  const handleMaxClick = () => {
    setAmount(utils.formatUnits(selectedActionValues.balanceRaw, selectedActionValues.decimals));
  };

  const currentBalanceAmount = Number(
    utils.formatUnits(selectedActionValues.balanceRaw, selectedActionValues.decimals),
  );

  const transferReadiness = useEarnTransferReadiness({
    amount,
    amountBalance: selectedActionValues.balanceRaw,
    amountDecimals: selectedActionValues.decimals,
    amountSymbol: assetSymbol ?? '',
    nativeBalance: nativeBalance || undefined,
    chainId,
    transactionSteps: transactionQuote?.transactionSteps,
    apiGasEstimate: transactionQuote?.estimatedGasUsd,
    enabled: isConnected && !!walletAddress && chainId !== 0,
  });

  const currentBalanceFormatted = formatAmount(selectedActionValues.balanceRaw, {
    decimals: selectedActionValues.decimals,
    symbol: assetSymbol,
  });

  const handleTransaction = async () => {
    if (
      !transferReadiness.isReady ||
      !transactionQuote?.transactionSteps ||
      transactionQuote.transactionSteps.length === 0
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
      setTxError(formatTransactionError(error));
    }
  };

  const positionValue = useMemo(() => {
    if (!lpTokenBalance.balanceRaw.gt(0)) return undefined;
    return {
      amount: formatAmount(lpTokenBalance.balanceRaw, {
        decimals: lpTokenBalance.decimals,
        symbol: assetSymbol,
      }),
      usdValue: formatUSD(parseFloat(lpToken?.balanceUsd ?? '0')),
    };
  }, [lpTokenBalance.balanceRaw, lpTokenBalance.decimals, assetSymbol, lpToken?.balanceUsd]);

  const transactionDetailsRows = useMemo(
    () => [
      { label: 'APY', value: currentApr },
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
    [currentApr, estimatedTxCostUsd, gasEstimateError, isGasEstimateLoading],
  );

  if (!availableActions && contextLoading) {
    return <EarnActionPanelSkeleton />;
  }

  const actionLabel = selectedAction === 'supply' ? 'Supply' : 'Withdraw';
  const amountLabel = `Amount to ${selectedAction === 'supply' ? 'supply' : 'withdraw'}`;
  const submitLabel = transactionQuoteLoading ? 'Fetching Quote...' : actionLabel;

  return (
    <Card className="bg-gray-1 rounded flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-white">
          {actionLabel} {assetSymbol}
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
        label={amountLabel}
        inputToken={{
          symbol: assetSymbol ?? '',
          logoUrl: vault?.asset?.assetLogo,
        }}
        currentBalance={currentBalanceFormatted}
        currentBalanceAmount={currentBalanceAmount}
        currentUsdValue={selectedActionValues.usdValue}
        isAmountExceedsBalance={amountExceedsBalance}
        isConnected={isConnected}
        validationError={
          transferReadiness.errorMessage
            ? typeof transferReadiness.errorMessage === 'string'
              ? transferReadiness.errorMessage
              : String(transferReadiness.errorMessage)
            : null
        }
      />

      <EarnTransactionDetailsSection details={transactionDetailsRows} />

      <EarnErrorDisplay error={txError || transactionQuoteError?.message || null} />

      <EarnActionSubmitButton
        label={submitLabel}
        onClick={handleTransaction}
        isSubmitting={isExecuting}
        disabled={
          !transferReadiness.isReady ||
          transactionQuoteLoading ||
          transferReadiness.isLoading ||
          !!transactionQuoteError
        }
        isConnected={isConnected}
      />
    </Card>
  );
}
