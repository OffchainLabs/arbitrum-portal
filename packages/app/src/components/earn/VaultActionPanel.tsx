'use client';

import { BigNumber, utils } from 'ethers';
import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';

import {
  type LendAvailableActions,
  useAvailableActions,
} from '@/app-hooks/earn/useAvailableActions';
import { useEarnActionTabs } from '@/app-hooks/earn/useEarnActionTabs';
import { useEarnGasEstimate } from '@/app-hooks/earn/useEarnGasEstimate';
import {
  type TransactionCall,
  useEarnTransactionExecution,
} from '@/app-hooks/earn/useEarnTransactionExecution';
import { addTransactionToHistory } from '@/app-hooks/earn/useEarnTransactionHistory';
import {
  checkAmountExceedsBalance,
  validateTransactionStep,
} from '@/app-hooks/earn/useEarnTransactionUtils';
import { useEarnTransferReadiness } from '@/app-hooks/earn/useEarnTransferReadiness';
import { useTokenBalance } from '@/app-hooks/earn/useTokenBalance';
import { type TransactionStep, useTransactionQuote } from '@/app-hooks/earn/useTransactionQuote';
import { ChainId } from '@/bridge/types/ChainId';
import { formatAmount, normalizeAmountForParseUnits } from '@/bridge/util/NumberUtils';
import { formatTransactionError } from '@/bridge/util/isUserRejectedError';
import { getNetworkName } from '@/bridge/util/networks';
import { Card } from '@/components/Card';
import { OpportunityCategory } from '@/earn-api/types';
import type { StandardTransactionHistory } from '@/earn-api/types';

import {
  EarnActionSubmitButton,
  EarnActionTabs,
  EarnAmountInputSection,
  EarnErrorDisplay,
  EarnGasEstimateDisplay,
  EarnPositionValueCard,
  EarnTransactionDetailsSection,
} from './EarnActionPanel';
import { EarnActionPanelSkeleton } from './EarnActionPanelSkeleton';
import { useEarnDialogs } from './EarnDialogsProvider';

export interface LendVaultContext {
  address: string;
  network?: { name?: string };
  asset?: { symbol?: string; address?: string; assetLogo?: string };
  name?: string;
  protocol?: { name?: string; protocolLogo?: string };
  apy?: number | { '7day'?: { total?: number }; '30day'?: { total?: number } };
}

interface VaultActionPanelProps {
  vault: LendVaultContext;
  initialAction?: 'supply' | 'withdraw';
  hidePositionOnMobile?: boolean;
}

type ActionType = 'supply' | 'withdraw';
type TxState = 'idle' | 'loading' | 'success';

export function VaultActionPanel({
  vault,
  initialAction = 'supply',
  hidePositionOnMobile = false,
}: VaultActionPanelProps) {
  const { address: walletAddress, isConnected } = useAccount();
  const { checkAndShowToS, showTransactionDetails } = useEarnDialogs();

  const [amount, setAmount] = useState('');
  const [selectedAction, setSelectedAction] = useState<ActionType>(initialAction);
  const [, setTxState] = useState<TxState>('idle');
  const [txError, setTxError] = useState<string | null>(null);

  // Update selectedAction when initialAction changes
  useEffect(() => {
    setSelectedAction(initialAction);
  }, [initialAction]);

  // Reset amount and error when action changes
  useEffect(() => {
    setAmount('');
    setTxError(null);
  }, [selectedAction]);

  // Fetch available actions and transaction context
  const {
    data: availableActions,
    isLoading: contextLoading,
    refetch: refetchContext,
  } = useAvailableActions({
    opportunityId: vault.address,
    category: OpportunityCategory.Lend,
    userAddress: walletAddress || null,
    network: vault.network?.name || 'arbitrum',
  });

  const lendActions = availableActions as LendAvailableActions | null;
  const transactionContext = lendActions?.transactionContext;
  const asset = transactionContext?.asset;
  const lpToken = transactionContext?.lpToken;

  const assetDecimals = asset?.decimals || 18;
  const assetSymbol = asset?.symbol || vault.asset?.symbol;
  const lpTokenDecimals = lpToken?.decimals || 18;

  const amountInRawUnits =
    amount && parseFloat(amount) > 0
      ? utils
          .parseUnits(
            normalizeAmountForParseUnits(
              amount,
              selectedAction === 'supply' ? assetDecimals : lpTokenDecimals,
            ),
            selectedAction === 'supply' ? assetDecimals : lpTokenDecimals,
          )
          .toString()
      : '0';

  // Get chainId from transactionQuote when available, otherwise use a fallback
  // We need this early for balance fetching, but it depends on quote which we'll fetch conditionally
  const fallbackChainId = ChainId.ArbitrumOne; // Default fallback

  // Fetch onchain balances for asset and lpToken (needed for balance check)
  const assetTokenAddress = asset?.address ?? vault.asset?.address ?? null;
  const lpTokenAddress = lpToken?.address ?? null;

  const { balance: assetBalanceOnchain, refetch: refetchAssetBalance } = useTokenBalance({
    tokenAddress: assetTokenAddress,
    chainId: fallbackChainId,
    enabled: isConnected && !!walletAddress && !!assetTokenAddress,
  });

  const { balance: lpTokenBalanceOnchain, refetch: refetchLpTokenBalance } = useTokenBalance({
    tokenAddress: lpTokenAddress,
    chainId: fallbackChainId,
    enabled: isConnected && !!walletAddress && !!lpTokenAddress,
  });

  // Use onchain balances when available, fallback to transaction context balances
  const assetBalanceRaw = assetBalanceOnchain || BigNumber.from(asset?.balanceNative ?? '0');
  const lpTokenBalanceRaw = lpTokenBalanceOnchain || BigNumber.from(lpToken?.balanceNative ?? '0');

  // Calculate current balance for the selected action (needed for balance check)
  const currentBalanceForQuote = useMemo(() => {
    return selectedAction === 'supply' ? assetBalanceRaw : lpTokenBalanceRaw;
  }, [selectedAction, assetBalanceRaw, lpTokenBalanceRaw]);

  const currentDecimalsForQuote = selectedAction === 'supply' ? assetDecimals : lpTokenDecimals;

  // Check if amount exceeds balance (only when wallet is connected)
  const amountExceedsBalance = useMemo(
    () =>
      checkAmountExceedsBalance(
        amount,
        currentBalanceForQuote,
        currentDecimalsForQuote,
        isConnected,
        walletAddress,
      ),
    [amount, currentBalanceForQuote, currentDecimalsForQuote, isConnected, walletAddress],
  );

  // Fetch transaction quote (replaces useActions)
  // When wallet is connected, don't fetch quote if amount exceeds balance
  // When wallet is not connected, allow fetching quote
  const { data: transactionQuote, isLoading: transactionQuoteLoading } = useTransactionQuote({
    opportunityId: vault.address,
    category: OpportunityCategory.Lend,
    action: selectedAction === 'supply' ? 'deposit' : 'redeem',
    amount: amountInRawUnits,
    userAddress: walletAddress || null,
    inputTokenAddress:
      selectedAction === 'supply' ? asset?.address || vault.asset?.address : vault.asset?.address,
    network: vault.network?.name || 'arbitrum',
    enabled:
      amountInRawUnits !== '0' &&
      parseFloat(amountInRawUnits) > 0 &&
      (!isConnected || !amountExceedsBalance),
  });

  // Get chainId from transactionQuote when available, otherwise use a fallback
  const fallbackChainIdFromQuote = useMemo(() => {
    if (transactionQuote?.transactionSteps && transactionQuote.transactionSteps.length > 0) {
      return transactionQuote.transactionSteps[0]?.chainId || ChainId.ArbitrumOne;
    }
    return ChainId.ArbitrumOne; // ArbitrumOne as default fallback
  }, [transactionQuote]);

  // Build transaction calls from transaction quote
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

  // Fetch native ETH balance for gas fee validation
  const { balance: nativeBalance } = useTokenBalance({
    tokenAddress: null, // null for native ETH
    chainId: fallbackChainIdFromQuote || fallbackChainId,
    enabled: isConnected && !!walletAddress && chainId !== 0,
  });

  // USD value from transaction context (can be cached, doesn't need onchain fetch)
  const assetUsdValue = parseFloat(asset?.balanceUsd ?? '0');
  const lpTokenUsdValue = parseFloat(lpToken?.balanceUsd ?? '0');

  const buildCalls = useMemo(() => {
    return (): TransactionCall[] => {
      if (!transactionQuote?.transactionSteps || transactionQuote.transactionSteps.length === 0) {
        throw new Error('No transaction steps found');
      }
      return transactionQuote.transactionSteps.map((step: TransactionStep, index: number) => {
        // Validate required fields
        validateTransactionStep(step, index);

        return {
          to: step.to as `0x${string}`,
          data: step.data as `0x${string}`,
          value: step.value ? BigInt(step.value) : undefined,
          chainId: step.chainId,
        };
      });
    };
  }, [transactionQuote]);

  const { executeTx, isExecuting } = useEarnTransactionExecution({
    chainId,
    buildCalls,
    onTransactionFinished: async ({ txHash }) => {
      setTxState('success');
      setAmount('');
      refetchContext();
      // Refetch onchain balances after transaction
      refetchAssetBalance();
      refetchLpTokenBalance();

      // Extract transaction details for popup and history
      const timestamp = Math.floor(Date.now() / 1000);
      const txChainId = chainId || 0;
      const txChainName = getNetworkName(txChainId);
      const formattedAmount = formatAmount(BigNumber.from(amountInRawUnits || '0'), {
        decimals: assetDecimals,
        symbol: assetSymbol,
      });

      const transactionDetails = {
        action: selectedAction === 'supply' ? 'supply' : 'withdraw',
        amount: amountInRawUnits || '0',
        tokenSymbol: assetSymbol ?? '',
        decimals: assetDecimals,
        assetLogo: vault.asset?.assetLogo,
        chainId: txChainId,
        txHash: txHash ?? '',
        timestamp,
        protocolName: vault.protocol?.name,
        protocolLogo: vault.protocol?.protocolLogo,
        networkFee: estimatedTxCostUsd
          ? {
              amount: estimatedTxCostUsd.eth,
              usd: estimatedTxCostUsd.usd,
            }
          : undefined,
        opportunityName: vault.name ?? 'Lend',
      };

      // Add transaction to history cache (optimistic update)
      if (walletAddress && txHash) {
        const newTransaction: StandardTransactionHistory = {
          timestamp,
          eventType: selectedAction === 'supply' ? 'deposit' : 'redeem',
          assetAmount: formattedAmount,
          assetSymbol: assetSymbol ?? '',
          assetLogo: vault.asset?.assetLogo,
          chainId: txChainId,
          chainName: txChainName,
          transactionHash: txHash ?? '',
        };

        await addTransactionToHistory({
          category: OpportunityCategory.Lend,
          opportunityId: vault.address,
          userAddress: walletAddress,
          network: vault.network?.name || 'arbitrum',
          vendor: 'vaults',
          transaction: newTransaction,
        });
      }

      // Show transaction details popup after receipt is confirmed (with tick animation)
      showTransactionDetails(transactionDetails, true);
    },
    inputAmount: amount,
  });

  const hasRedeem = availableActions?.availableActions?.includes('redeem') ?? false;

  // Check if user has a position (LP token balance > 0)
  const hasPosition = lpTokenBalanceRaw.gt(0);

  const actionTabs = useEarnActionTabs({
    primaryAction: { id: 'supply', label: 'Supply' },
    secondaryAction: { id: 'withdraw', label: 'Withdraw' },
    hasSecondaryAction: hasRedeem && hasPosition,
    selectedAction,
    setSelectedAction: setSelectedAction as (action: string) => void,
  });

  const currentApr: string = (() => {
    if (vault.apy != null && typeof vault.apy === 'object' && '7day' in vault.apy) {
      const apy7day = vault.apy['7day'];
      if (apy7day && typeof apy7day === 'object' && 'total' in apy7day) {
        const total = apy7day.total;
        if (typeof total === 'number') return `${(total * 100).toFixed(2)}%`;
      }
    }
    if (typeof vault.apy === 'number') return `${(vault.apy * 100).toFixed(2)}%`;
    return '—';
  })();

  // Use unified gas estimation hook
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
  const currentSymbol = selectedAction === 'supply' ? assetSymbol : assetSymbol;
  const currentUsdValue = selectedAction === 'supply' ? assetUsdValue : lpTokenUsdValue;

  // Use unified transfer readiness hook
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

    // Check ToS before proceeding (hook validates but doesn't show popup)
    const tosAccepted = await checkAndShowToS();
    if (!tosAccepted) {
      return; // User didn't accept ToS or closed the popup
    }

    setTxState('loading');
    setTxError(null);

    try {
      await executeTx();
    } catch (error) {
      setTxState('idle');
      setTxError(formatTransactionError(error));
      // Close popup on error - user can see error in the panel
      // The popup will remain in loading state, but we could add error handling here if needed
    }
  };

  const positionValue = useMemo(() => {
    if (!lpTokenBalanceRaw.gt(0)) return undefined;
    return {
      amount: formatAmount(lpTokenBalanceRaw, {
        decimals: lpTokenDecimals,
        symbol: assetSymbol,
      }),
      usdValue: `$${lpTokenUsdValue.toFixed(2)} USD`,
    };
  }, [lpTokenBalanceRaw, lpTokenDecimals, assetSymbol, lpTokenUsdValue]);

  if (!availableActions && contextLoading) {
    return <EarnActionPanelSkeleton />; // show skeleton for the first time the panel is rendered
  }

  return (
    <Card className="bg-[#191919] rounded-lg flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-white">
          {selectedAction === 'supply' ? 'Supply' : 'Withdraw'} {assetSymbol}
        </h3>
      </div>

      {/* Position Value Card */}
      {positionValue && (
        <EarnPositionValueCard positionValue={positionValue} hideOnMobile={hidePositionOnMobile} />
      )}

      {/* Action Tabs */}
      <EarnActionTabs
        tabs={actionTabs}
        selectedAction={selectedAction}
        onActionChange={(action) => {
          setSelectedAction(action as ActionType);
          setAmount('');
          setTxError(null);
        }}
      />

      {/* Amount Input Section */}
      <EarnAmountInputSection
        amount={amount}
        onAmountChange={setAmount}
        onMaxClick={handleMaxClick}
        label={`Amount to ${selectedAction === 'supply' ? 'supply' : 'withdraw'}`}
        inputToken={{
          symbol: assetSymbol ?? '',
          logoUrl: vault?.asset?.assetLogo,
        }}
        currentBalance={currentBalanceFormatted}
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

      {/* Transaction Details */}
      <EarnTransactionDetailsSection
        details={[
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
        ]}
      />

      {/* Error Display - Only show transaction errors, not validation errors */}
      <EarnErrorDisplay error={txError || null} />

      {/* Submit Button */}
      <EarnActionSubmitButton
        label={
          transactionQuoteLoading
            ? 'Fetching Quote...'
            : selectedAction === 'supply'
              ? 'Supply'
              : 'Withdraw'
        }
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
