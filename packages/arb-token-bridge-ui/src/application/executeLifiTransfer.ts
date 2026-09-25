import type { RouteExtended } from '@lifi/sdk';
import dayjs from 'dayjs';
import { BaseError } from 'viem';

import { getTokenOverride } from '../app/api/crosschain-transfers/utils';
import { highlightTransactionHistoryDisclaimer } from '../components/TransactionHistory/TransactionHistoryDisclaimer';
import { getTransferWarningDialogType } from '../components/TransferPanel/TransferWarningUtils';
import { getAmountToPay } from '../components/TransferPanel/useTransferReadiness';
import { errorToast } from '../components/common/atoms/Toast';
import { AssetType } from '../hooks/arbTokenBridge.types';
import { DepositStatus, LifiMergedTransaction, WithdrawalStatus } from '../state/app/state';
import { getLifiAssetType, trackEvent } from '../util/AnalyticsUtils';
import { getLifiRouteToolsDetails } from '../util/LifiRouteUtils';
import {
  getExecutedLifiRouteTxHash,
  getPendingLifiRouteBatchIds,
} from '../util/LifiTransactionStatus';
import { isUserRejectedError } from '../util/isUserRejectedError';
import { getNetworkName } from '../util/networks';
import { getNativeTokenAddress } from '../wallet/constants';
import type { TransferCallbacks, TransferSubmission } from './executeTransfer';
import { resolveLifiTransferStarter } from './resolveLifiTransferStarter';

export async function executeLifiTransfer(
  snapshot: TransferSubmission,
  callbacks: TransferCallbacks,
) {
  const {
    networks,
    childChain,
    parentChain,
    sourceWallet,
    walletAddress,
    destinationWalletAddress,
    destinationAddress,
    selectedToken,
    amount,
    amountBigNumber,
    selectedRoute,
    context,
    nativeCurrency,
    isDepositMode,
    isSmartContractWallet,
    isSwapTransfer,
    isTransferAllowed,
  } = snapshot;
  const {
    setTransferring,
    confirmDialog,
    confirmCustomDestinationAddress,
    showDelayedSmartContractTxRequest,
    handleError,
    addPendingTransaction,
    updatePendingTransaction,
    addLifiTransactionToCache,
    updateLifiTransactionInCache,
    removeLifiTransactionFromCache,
    resetAmountAndSwitchToTransactionHistoryTab,
    clearRoute,
    refreshTokenBalances,
  } = callbacks;

  const refreshCurrentTokenBalances = async () => {
    const recipient = destinationAddress || destinationWalletAddress;
    await Promise.all([
      refreshTokenBalances({ chainId: networks.sourceChain.id, walletAddress }),
      ...(recipient
        ? [
            refreshTokenBalances({
              chainId: networks.destinationChain.id,
              walletAddress: recipient,
            }),
          ]
        : []),
    ]);
  };

  try {
    if (!isTransferAllowed) {
      throw new Error('Transfer not allowed');
    }
    if (!context) {
      return;
    }

    setTransferring(true);

    const { fromAmountUsd, toAmountUsd } = getAmountToPay(context);
    const warningDialogType = getTransferWarningDialogType({
      fromAmount: context.fromAmount,
      toAmount: context.toAmount,
      fromToken: context.protocolData.route.fromToken,
      toToken: context.protocolData.route.toToken,
      fromAmountUsd,
      toAmountUsd,
    });

    if (warningDialogType) {
      const confirmation = await confirmDialog(warningDialogType);
      if (!confirmation) return;
    }

    if (!(await confirmCustomDestinationAddress())) {
      return;
    }

    const tokenOverrides = getTokenOverride({
      fromToken: selectedToken?.address,
      sourceChainId: networks.sourceChain.id,
      destinationChainId: networks.destinationChain.id,
    });
    const destinationChainErc20Address =
      tokenOverrides.destination?.address ||
      (isDepositMode ? selectedToken?.l2Address : selectedToken?.address);
    const sourceChainErc20Address =
      tokenOverrides.source?.address ||
      (isDepositMode ? selectedToken?.address : selectedToken?.l2Address);

    const resolution = await resolveLifiTransferStarter({
      route: context,
      wallet: sourceWallet,
      destinationChainErc20Address,
      sourceChainErc20Address,
    });

    if (isSmartContractWallet) {
      showDelayedSmartContractTxRequest();
    }

    const assetType = getLifiAssetType({
      tokenAddress: context.fromAmount.token.address,
      chainId: networks.sourceChain.id,
    });
    const destinationAssetType = getLifiAssetType({
      tokenAddress: context.toAmount.token.address,
      chainId: networks.destinationChain.id,
    });

    let cachedLifiTransfer: LifiMergedTransaction | null = null;
    const createLifiTransfer = (
      lifiRoute: RouteExtended,
      txId: string,
      showInHistory: boolean,
    ): LifiMergedTransaction => {
      const toolsDetails = getLifiRouteToolsDetails(context.protocolData.route);

      return {
        txId,
        asset: selectedToken?.symbol || nativeCurrency.symbol,
        assetType: assetType === 'ETH' ? AssetType.ETH : AssetType.ERC20,
        blockNum: null,
        createdAt: dayjs().valueOf(),
        direction: isDepositMode ? 'deposit' : 'withdraw',
        isWithdrawal: !isDepositMode,
        resolvedAt: null,
        status: WithdrawalStatus.UNCONFIRMED,
        destinationStatus: WithdrawalStatus.UNCONFIRMED,
        uniqueId: null,
        value: amount,
        depositStatus: DepositStatus.LIFI_DEFAULT_STATE,
        destination: destinationAddress ?? destinationWalletAddress,
        sender: walletAddress,
        isLifi: true,
        tokenAddress: selectedToken?.address || getNativeTokenAddress(networks.sourceChain.id),
        parentChainId: parentChain.id,
        childChainId: childChain.id,
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id,
        toolsDetails,
        durationMs: context.durationMs,
        fromAmount: { ...context.fromAmount },
        toAmount: { ...context.toAmount },
        destinationTxId: null,
        lifiRoute,
        showInHistory,
      };
    };

    const updateCachedLifiRoute = (lifiRoute: RouteExtended) => {
      const txHash = getExecutedLifiRouteTxHash(lifiRoute);

      if (!cachedLifiTransfer && !isSmartContractWallet) {
        if (!txHash && getPendingLifiRouteBatchIds(lifiRoute).length === 0) {
          return;
        }

        const newTransfer = createLifiTransfer(lifiRoute, txHash ?? lifiRoute.id, Boolean(txHash));
        cachedLifiTransfer = newTransfer;
        addLifiTransactionToCache(newTransfer);
        if (txHash) {
          addPendingTransaction(newTransfer);
        }
        return;
      }

      if (!cachedLifiTransfer) {
        return;
      }

      const becameVisible = cachedLifiTransfer.showInHistory === false && Boolean(txHash);
      const routeUpdates = {
        lifiRoute,
        ...(becameVisible ? { txId: txHash, showInHistory: true } : {}),
      };
      cachedLifiTransfer = {
        ...cachedLifiTransfer,
        ...routeUpdates,
      };
      if (becameVisible) {
        addPendingTransaction(cachedLifiTransfer);
      }
      updatePendingTransaction(cachedLifiTransfer);
      updateLifiTransactionInCache(cachedLifiTransfer, routeUpdates);
    };

    const routeCallbacks = {
      onRouteUpdate: updateCachedLifiRoute,
      onRouteExecutionComplete: () => {
        void refreshCurrentTokenBalances();
      },
      onRouteExecutionError: (error: unknown, latestRoute: RouteExtended | undefined) => {
        void refreshCurrentTokenBalances();

        if (isUserRejectedError(error)) {
          if (cachedLifiTransfer?.showInHistory === false) {
            removeLifiTransactionFromCache(cachedLifiTransfer);
            cachedLifiTransfer = null;
          } else if (latestRoute && getExecutedLifiRouteTxHash(latestRoute)) {
            updateCachedLifiRoute(latestRoute);
          }
          return;
        }

        if (!getExecutedLifiRouteTxHash(latestRoute)) {
          return;
        }

        handleError({
          error,
          label: 'lifi_route_execution',
          category: 'token_transfer',
        });
        errorToast(
          'LiFi transaction execution was interrupted. Check transaction history for its latest status.',
        );
      },
    };

    const transfer = await (async () => {
      switch (resolution.ecosystem) {
        case 'evm':
          return resolution.starter.transfer({
            amount: amountBigNumber,
            destinationAddress,
            wagmiConfig: resolution.wagmiConfig,
            onApprovalRequest: (approvalRequest) =>
              confirmDialog('approve_lifi_token', { lifiApproval: { approvalRequest } }),
            ...routeCallbacks,
          });
        case 'solana':
          return resolution.starter.transfer(routeCallbacks);
      }
    })();

    resetAmountAndSwitchToTransactionHistoryTab();
    clearRoute();

    if (isSmartContractWallet) {
      setTimeout(() => highlightTransactionHistoryDisclaimer(), 100);
    }

    trackEvent('Lifi Transfer', {
      tokenSymbol: context.fromAmount.token.symbol,
      assetType,
      destinationTokenSymbol: context.toAmount.token.symbol,
      destinationAssetType,
      accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
      network: getNetworkName(networks.sourceChain.id),
      amount: Number(amount),
      sourceChain: getNetworkName(networks.sourceChain.id),
      destinationChain: getNetworkName(networks.destinationChain.id),
      tag: selectedRoute,
      isSwap: isSwapTransfer,
    });

    const sourceChainTransaction = transfer.sourceChainTransaction;
    if ('wait' in sourceChainTransaction && sourceChainTransaction.wait) {
      await sourceChainTransaction.wait();
      await refreshCurrentTokenBalances();
    }
  } catch (error) {
    if (isUserRejectedError(error)) {
      return;
    }

    handleError({
      error,
      label: 'lifi_transfer',
      category: 'token_transfer',
    });
    errorToast(
      `Lifi transaction failed: ${error instanceof BaseError ? error.shortMessage : error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    setTransferring(false);
  }
}
