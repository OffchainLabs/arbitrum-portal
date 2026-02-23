'use client';

import { BigNumber, utils } from 'ethers';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Address, getAddress } from 'viem';
import { useAccount, useBalance } from 'wagmi';

import { getEarnRequestNetwork } from '@/app-hooks/earn/getEarnRequestNetwork';
import { useAvailableActions } from '@/app-hooks/earn/useAvailableActions';
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
import { type TransactionStep, useTransactionQuote } from '@/app-hooks/earn/useTransactionQuote';
import { OpportunityCategory } from '@/app-types/earn/vaults';
import { formatAmount, formatUSD, truncateExtraDecimals } from '@/bridge/util/NumberUtils';
import { formatTransactionError } from '@/bridge/util/isUserRejectedError';
import { getNetworkName } from '@/bridge/util/networks';
import { Card } from '@/components/Card';
import {
  type StandardTransactionHistory,
  Vendor,
  getEarnChainIdFromNetwork,
} from '@/earn-api/types';

import { EarnActionSubmitButton } from './EarnActionPanel/EarnActionSubmitButton';
import { EarnActionTabs } from './EarnActionPanel/EarnActionTabs';
import { EarnAmountInputSection } from './EarnActionPanel/EarnAmountInputSection';
import { EarnErrorDisplay } from './EarnActionPanel/EarnErrorDisplay';
import { EarnGasEstimateDisplay } from './EarnActionPanel/EarnGasEstimateDisplay';
import { EarnPositionValueCard } from './EarnActionPanel/EarnPositionValueCard';
import { EarnTransactionDetailsSection } from './EarnActionPanel/EarnTransactionDetailsSection';
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
const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

function normalizeTokenAddress(tokenAddress: string | null): Address | undefined {
  if (!tokenAddress || tokenAddress === NATIVE_TOKEN_ADDRESS) {
    return undefined;
  }

  try {
    return getAddress(tokenAddress);
  } catch {
    return undefined;
  }
}

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
  const requestNetwork = useMemo(
    () => getEarnRequestNetwork(vault.network?.name),
    [vault.network?.name],
  );
  const requestChainId = useMemo(() => getEarnChainIdFromNetwork(requestNetwork), [requestNetwork]);

  useEffect(() => {
    setSelectedAction(initialAction);
  }, [initialAction]);

  useEffect(() => {
    setAmount('');
    setTxError(null);
  }, [selectedAction]);

  const {
    data: availableActions,
    isLoading: contextLoading,
    refetch: refetchContext,
  } = useAvailableActions({
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
  const isAssetNativeBalance = !assetTokenAddress || assetTokenAddress === NATIVE_TOKEN_ADDRESS;
  const shouldFetchAssetBalance =
    isConnected && !!walletAddress && (isAssetNativeBalance || !!normalizedAssetTokenAddress);
  const shouldFetchLpTokenBalance = isConnected && !!walletAddress && !!normalizedLpTokenAddress;

  const { data: assetBalanceData, refetch: refetchAssetBalance } = useBalance({
    address: shouldFetchAssetBalance ? walletAddress : undefined,
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
    address: shouldFetchLpTokenBalance ? walletAddress : undefined,
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

  const buildCalls = useCallback((): TransactionCall[] => {
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
      setTxState('success');
      setAmount('');
      refetchContext();
      void refetchAssetBalance();
      void refetchLpTokenBalance();

      const timestamp = Math.floor(Date.now() / 1000);
      const txChainId = chainId || 0;
      const txChainName = getNetworkName(txChainId);

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
              usd: estimatedTxCostUsd.usd ?? undefined,
            }
          : undefined,
        opportunityName: vault.name ?? 'Lend',
      };

      if (walletAddress && txHash) {
        const newTransaction: StandardTransactionHistory = {
          timestamp,
          eventType: selectedAction === 'supply' ? 'deposit' : 'redeem',
          assetAmountRaw: amountInRawUnits || '0',
          assetSymbol: assetSymbol ?? '',
          decimals: assetDecimals,
          assetLogo: vault.asset?.assetLogo,
          chainId: txChainId,
          chainName: txChainName,
          transactionHash: txHash ?? '',
        };

        await addTransactionToHistory({
          category: OpportunityCategory.Lend,
          opportunityId: vault.address,
          userAddress: walletAddress,
          chainId: requestChainId,
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

    setTxState('loading');
    setTxError(null);

    try {
      await executeTx();
    } catch (error) {
      setTxState('idle');
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

  if (!availableActions && contextLoading) {
    return <EarnActionPanelSkeleton />;
  }

  return (
    <Card className="bg-gray-1 rounded flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-white">
          {selectedAction === 'supply' ? 'Supply' : 'Withdraw'} {assetSymbol}
        </h3>
      </div>

      {positionValue &&
        (hidePositionOnMobile ? (
          <div className="hidden lg:flex">
            <EarnPositionValueCard positionValue={positionValue} />
          </div>
        ) : (
          <EarnPositionValueCard positionValue={positionValue} />
        ))}

      <EarnActionTabs
        tabs={actionTabs}
        selectedAction={selectedAction}
        onActionChange={(action) => {
          setSelectedAction(action as ActionType);
          setAmount('');
          setTxError(null);
        }}
      />

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

      <EarnErrorDisplay error={txError || null} />

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
