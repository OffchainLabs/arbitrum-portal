'use client';

import { BigNumber, constants, utils } from 'ethers';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Address, getAddress } from 'viem';
import { useAccount, useBalance } from 'wagmi';

import { useAvailableActions } from '@/app-hooks/earn/useAvailableActions';
import { useEarnActionTabs } from '@/app-hooks/earn/useEarnActionTabs';
import { useEarnGasEstimate } from '@/app-hooks/earn/useEarnGasEstimate';
import {
  type TransactionCall,
  useEarnTransactionExecution,
} from '@/app-hooks/earn/useEarnTransactionExecution';
import { useEarnTransactionHistory } from '@/app-hooks/earn/useEarnTransactionHistory';
import {
  checkAmountExceedsBalance,
  validateTransactionStep,
} from '@/app-hooks/earn/useEarnTransactionUtils';
import { useEarnTransferReadiness } from '@/app-hooks/earn/useEarnTransferReadiness';
import { useTransactionQuote } from '@/app-hooks/earn/useTransactionQuote';
import { OpportunityCategory } from '@/app-types/earn/vaults';
import { addressesEqual } from '@/bridge/util/AddressUtils';
import { formatAmount, formatUSD, truncateExtraDecimals } from '@/bridge/util/NumberUtils';
import { formatTransactionError } from '@/bridge/util/isUserRejectedError';
import { Card } from '@/components/Card';
import {
  type StandardOpportunityLend,
  type StandardTransactionHistory,
  type TransactionStep,
  Vendor,
} from '@/earn-api/types';

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

function normalizeTokenAddress(tokenAddress: string | null): Address | undefined {
  if (!tokenAddress || addressesEqual(tokenAddress, constants.AddressZero)) {
    return undefined;
  }

  try {
    return getAddress(tokenAddress);
  } catch {
    return undefined;
  }
}

function formatApr(apy: number | undefined) {
  if (apy == null || !Number.isFinite(apy)) {
    return '—';
  }
  return `${(apy * 100).toFixed(2)}%`;
}

export function VaultActionPanel({
  opportunity,
  initialAction = 'supply',
  hidePositionOnMobile = false,
  checkAndShowToS,
  showTransactionDetails,
}: VaultActionPanelProps) {
  const posthog = usePostHog();
  const vault = useMemo(
    () => ({
      address: opportunity.id,
      chainId: opportunity.chainId,
      asset: {
        symbol: opportunity.lend?.assetSymbol ?? '',
        address: opportunity.lend?.assetAddress ?? '',
        assetLogo: opportunity.lend?.assetLogo,
      },
      name: opportunity.name,
      protocol: {
        name: opportunity.lend?.protocolName ?? opportunity.protocol,
        protocolLogo: opportunity.lend?.protocolLogo,
      },
      apy: opportunity.lend?.apy7day != null ? opportunity.lend.apy7day / 100 : undefined,
    }),
    [opportunity],
  );
  const { address: walletAddress, isConnected } = useAccount();

  const [amount, setAmount] = useState('');
  const [selectedAction, setSelectedAction] = useState<ActionType>(initialAction);
  const [txError, setTxError] = useState<string | null>(null);
  const requestChainId = vault.chainId;

  useEffect(() => {
    setSelectedAction(initialAction);
  }, [initialAction]);

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

  const assetDecimals = asset?.decimals || 18;
  const assetSymbol = asset?.symbol || vault.asset?.symbol;
  const lpTokenDecimals = lpToken?.decimals || 18;

  const amountInRawUnits =
    amount && parseFloat(amount) > 0
      ? utils
          .parseUnits(
            truncateExtraDecimals(
              amount,
              selectedAction === 'supply' ? assetDecimals : lpTokenDecimals,
            ),
            selectedAction === 'supply' ? assetDecimals : lpTokenDecimals,
          )
          .toString()
      : '0';

  const networkChainId = requestChainId;

  const assetTokenAddress = asset?.address ?? vault.asset?.address ?? null;
  const lpTokenAddress = lpToken?.address ?? null;

  const normalizedAssetTokenAddress = useMemo(
    () => normalizeTokenAddress(assetTokenAddress),
    [assetTokenAddress],
  );
  const normalizedLpTokenAddress = useMemo(
    () => normalizeTokenAddress(lpTokenAddress),
    [lpTokenAddress],
  );
  const isAssetNativeBalance =
    !assetTokenAddress || addressesEqual(assetTokenAddress, constants.AddressZero);
  const shouldFetchAssetBalance =
    isConnected && !!walletAddress && (isAssetNativeBalance || !!normalizedAssetTokenAddress);
  const shouldFetchLpTokenBalance = isConnected && !!walletAddress && !!normalizedLpTokenAddress;

  const { data: assetBalanceData, refetch: refetchAssetBalance } = useBalance({
    address: walletAddress,
    chainId: networkChainId,
    token: isAssetNativeBalance ? undefined : normalizedAssetTokenAddress,
    query: {
      enabled: shouldFetchAssetBalance,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 15_000,
    },
  });

  const { data: lpTokenBalanceData, refetch: refetchLpTokenBalance } = useBalance({
    address: walletAddress,
    chainId: networkChainId,
    token: normalizedLpTokenAddress,
    query: {
      enabled: shouldFetchLpTokenBalance,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 15_000,
    },
  });

  const assetBalanceOnchain = useMemo(
    () => (assetBalanceData ? BigNumber.from(assetBalanceData.value.toString()) : null),
    [assetBalanceData],
  );
  const lpTokenBalanceOnchain = useMemo(
    () => (lpTokenBalanceData ? BigNumber.from(lpTokenBalanceData.value.toString()) : null),
    [lpTokenBalanceData],
  );

  const assetBalanceRaw = assetBalanceOnchain || BigNumber.from(asset?.balanceNative ?? '0');
  const lpTokenBalanceRaw = lpTokenBalanceOnchain || BigNumber.from(lpToken?.balanceNative ?? '0');

  const currentBalanceForQuote = selectedAction === 'supply' ? assetBalanceRaw : lpTokenBalanceRaw;

  const amountExceedsBalance = useMemo(
    () =>
      checkAmountExceedsBalance(
        amountInRawUnits,
        currentBalanceForQuote,
        isConnected,
        walletAddress,
      ),
    [amountInRawUnits, currentBalanceForQuote, isConnected, walletAddress],
  );

  const { data: transactionQuote, isLoading: transactionQuoteLoading } = useTransactionQuote({
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

  const fallbackChainIdFromQuote = useMemo(() => {
    if (transactionQuote?.transactionSteps && transactionQuote.transactionSteps.length > 0) {
      return transactionQuote.transactionSteps[0]?.chainId || networkChainId;
    }
    return networkChainId;
  }, [transactionQuote, networkChainId]);

  const chainId = useMemo(() => {
    if (!transactionQuote?.transactionSteps || transactionQuote.transactionSteps.length === 0) {
      return 0;
    }
    const txChainId = transactionQuote.transactionSteps[0]?.chainId;
    if (!txChainId) {
      throw new Error('Invalid transaction step: missing chainId');
    }
    return txChainId;
  }, [transactionQuote]);

  const shouldFetchNativeBalance = isConnected && !!walletAddress && chainId !== 0;
  const { data: nativeBalanceData } = useBalance({
    address: shouldFetchNativeBalance ? walletAddress : undefined,
    chainId: fallbackChainIdFromQuote || networkChainId,
    query: {
      enabled: shouldFetchNativeBalance,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 15_000,
    },
  });
  const nativeBalance = useMemo(
    () => (nativeBalanceData ? BigNumber.from(nativeBalanceData.value.toString()) : null),
    [nativeBalanceData],
  );

  const assetUsdValue = parseFloat(asset?.balanceUsd ?? '0');
  const lpTokenUsdValue = parseFloat(lpToken?.balanceUsd ?? '0');

  const buildCalls = useCallback(async (): Promise<TransactionCall[]> => {
    if (!transactionQuote?.transactionSteps || transactionQuote.transactionSteps.length === 0) {
      throw new Error('No transaction steps found');
    }

    return transactionQuote.transactionSteps.map((step: TransactionStep, index: number) => {
      validateTransactionStep(step, index);

      return {
        to: step.to as `0x${string}`,
        data: step.data as `0x${string}`,
        value: step.value ? BigInt(step.value) : undefined,
        chainId: step.chainId,
      };
    });
  }, [transactionQuote]);

  const { executeTx, isExecuting } = useEarnTransactionExecution({
    chainId,
    buildCalls,
    onTransactionFinished: async ({ txHash }) => {
      setAmount('');
      refetchAssetBalance();
      refetchLpTokenBalance();

      const timestamp = Math.floor(Date.now() / 1000);
      const txChainId = chainId || 0;
      const quoteReceiveAmount = transactionQuote?.receiveAmount;
      const hasReceiveAmount = Boolean(quoteReceiveAmount && /^\d+$/.test(quoteReceiveAmount));
      const inputAmountRaw = amountInRawUnits || '0';
      const inputTokenSymbol = assetSymbol ?? '';
      const inputTokenDecimals = assetDecimals;
      const outputAmountRaw = hasReceiveAmount ? quoteReceiveAmount || undefined : undefined;
      const outputTokenSymbol =
        selectedAction === 'supply' ? (lpToken?.symbol ?? assetSymbol ?? '') : (assetSymbol ?? '');
      const outputTokenDecimals = selectedAction === 'supply' ? lpTokenDecimals : assetDecimals;
      const shouldDisplayOutput =
        selectedAction === 'withdraw' &&
        Boolean(outputAmountRaw && /^\d+$/.test(outputAmountRaw) && outputTokenSymbol);
      const displayAmountRaw = shouldDisplayOutput ? outputAmountRaw || '0' : inputAmountRaw;
      const displayTokenSymbol = shouldDisplayOutput ? outputTokenSymbol : inputTokenSymbol;
      const displayTokenDecimals = shouldDisplayOutput ? outputTokenDecimals : inputTokenDecimals;

      if (txHash) {
        posthog?.capture('Earn Transaction Succeeded', {
          page: 'Earn',
          section: 'Action Panel',
          category: OpportunityCategory.Lend,
          action: selectedAction,
          opportunityId: vault.address,
          opportunityName: vault.name,
          protocol: vault.protocol?.name,
          chainId: requestChainId,
          transactionHash: txHash,
          walletConnected: isConnected,
          inputToken: inputTokenSymbol,
          inputAmountRaw,
          outputToken: outputTokenSymbol,
          outputAmountRaw,
        });
      }

      const transactionDetails = {
        action: selectedAction === 'supply' ? 'supply' : 'withdraw',
        amount: displayAmountRaw,
        tokenSymbol: displayTokenSymbol,
        decimals: displayTokenDecimals,
        assetLogo: vault.asset?.assetLogo,
        chainId: txChainId,
        txHash: txHash ?? '',
        timestamp,
        protocolName: vault.protocol?.name,
        protocolLogo: vault.protocol?.protocolLogo,
        networkFee:
          estimatedTxCostUsd?.eth && estimatedTxCostUsd.eth !== '—'
            ? {
                amount: `~${estimatedTxCostUsd.eth} ETH`,
              }
            : undefined,
        opportunityName: vault.name ?? 'Lend',
      };

      if (walletAddress && txHash) {
        const newTransaction: StandardTransactionHistory = {
          timestamp,
          eventType: selectedAction === 'supply' ? 'deposit' : 'redeem',
          assetAmountRaw: displayAmountRaw,
          assetSymbol: displayTokenSymbol,
          decimals: displayTokenDecimals,
          assetLogo: vault.asset?.assetLogo,
          inputAssetAmountRaw: inputAmountRaw,
          inputAssetSymbol: inputTokenSymbol,
          inputAssetDecimals: inputTokenDecimals,
          inputAssetLogo: vault.asset?.assetLogo,
          outputAssetAmountRaw: outputAmountRaw,
          outputAssetSymbol: outputTokenSymbol,
          outputAssetDecimals: outputTokenDecimals,
          outputAssetLogo: vault.asset?.assetLogo,
          chainId: txChainId,
          transactionHash: txHash ?? '',
        };

        await addTransaction({
          vendor: Vendor.Vaults,
          transaction: newTransaction,
        });
      }

      showTransactionDetails(transactionDetails, true);
    },
    inputAmount: amount,
  });

  const hasRedeem = availableActions?.availableActions?.includes('redeem') ?? false;

  const hasPosition = lpTokenBalanceRaw.gt(0);

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
        walletConnected: isConnected,
      });
    },
    [
      isConnected,
      posthog,
      requestChainId,
      selectedAction,
      vault.address,
      vault.name,
      vault.protocol,
    ],
  );

  const currentApr = formatApr(vault.apy);

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

  const handleMaxClick = () => {
    if (selectedAction === 'supply') {
      setAmount(utils.formatUnits(assetBalanceRaw, assetDecimals));
    } else {
      setAmount(utils.formatUnits(lpTokenBalanceRaw, lpTokenDecimals));
    }
  };

  const currentBalanceRaw = selectedAction === 'supply' ? assetBalanceRaw : lpTokenBalanceRaw;
  const currentDecimals = selectedAction === 'supply' ? assetDecimals : lpTokenDecimals;
  const currentSymbol = assetSymbol;
  const currentUsdValue = selectedAction === 'supply' ? assetUsdValue : lpTokenUsdValue;
  const currentBalanceAmount = Number(utils.formatUnits(currentBalanceRaw, currentDecimals));

  const transferReadiness = useEarnTransferReadiness({
    amount,
    amountBalance: currentBalanceRaw,
    amountDecimals: currentDecimals,
    amountSymbol: currentSymbol ?? '',
    nativeBalance: nativeBalance || undefined,
    chainId,
    transactionSteps: transactionQuote?.transactionSteps,
    apiGasEstimate: transactionQuote?.estimatedGasUsd,
    enabled: isConnected && !!walletAddress && chainId !== 0,
  });

  const isAmountExceedsBalance = !!(
    amount && parseFloat(amount) > Number(utils.formatUnits(currentBalanceRaw, currentDecimals))
  );

  const currentBalanceFormatted = formatAmount(currentBalanceRaw, {
    decimals: currentDecimals,
    symbol: currentSymbol,
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
    if (!lpTokenBalanceRaw.gt(0)) return undefined;
    return {
      amount: formatAmount(lpTokenBalanceRaw, {
        decimals: lpTokenDecimals,
        symbol: assetSymbol,
      }),
      usdValue: formatUSD(lpTokenUsdValue),
    };
  }, [lpTokenBalanceRaw, lpTokenDecimals, assetSymbol, lpTokenUsdValue]);
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
        currentUsdValue={currentUsdValue}
        isAmountExceedsBalance={isAmountExceedsBalance}
        isConnected={isConnected}
        decimals={currentDecimals}
        validationError={
          transferReadiness.errorMessage
            ? typeof transferReadiness.errorMessage === 'string'
              ? transferReadiness.errorMessage
              : String(transferReadiness.errorMessage)
            : null
        }
      />

      <EarnTransactionDetailsSection details={transactionDetailsRows} />

      <EarnErrorDisplay error={txError || null} />

      <EarnActionSubmitButton
        label={submitLabel}
        onClick={handleTransaction}
        isSubmitting={isExecuting}
        disabled={
          !transferReadiness.isReady || transactionQuoteLoading || transferReadiness.isLoading
        }
        isConnected={isConnected}
      />
    </Card>
  );
}
