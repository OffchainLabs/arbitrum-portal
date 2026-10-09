import type { RouteExtended } from '@lifi/sdk';
import dayjs from 'dayjs';
import { utils } from 'ethers';
import { BaseError } from 'viem';

import { getTokenOverride } from '../app/api/crosschain-transfers/utils';
import { AssetType } from '../hooks/arbTokenBridge.types';
import { DepositStatus, LifiMergedTransaction, WithdrawalStatus } from '../state/app/state';
import { normalizeAddress } from '../util/AddressUtils';
import { getLifiAssetType, trackEvent } from '../util/AnalyticsUtils';
import { getLifiRouteToolsDetails } from '../util/LifiRouteUtils';
import {
  getExecutedLifiRouteTxHash,
  getPendingLifiRouteBatchIds,
} from '../util/LifiTransactionStatus';
import { getAmountToPay } from '../util/TransferAmounts';
import { getTransferWarningDialogType } from '../util/TransferWarningUtils';
import { isUserRejectedError } from '../util/isUserRejectedError';
import { isValidAddressForChain } from '../util/isValidAddressForChain';
import { getNetworkName } from '../util/networks';
import { getNativeTokenAddress } from '../wallet/constants';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
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
    destinationAddressError,
    destinationTokenAddress,
    selectedToken,
    amount,
    amountBigNumber,
    selectedRoute,
    context,
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
    try {
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
    } catch (error) {
      handleError({
        error,
        label: 'lifi_balance_refresh',
        category: 'network_request',
        level: 'warning',
      });
    }
  };

  try {
    if (!isTransferAllowed) {
      throw new Error('Transfer not allowed');
    }
    if (destinationAddressError) {
      throw new Error(destinationAddressError);
    }
    if (!context) {
      return;
    }

    const recipientAddress = destinationAddress ?? destinationWalletAddress;
    if (
      !recipientAddress ||
      !isValidAddressForChain(recipientAddress, networks.destinationChain.id)
    ) {
      throw new Error('A valid destination address is required.');
    }
    const recipient = normalizeAddress(
      getWalletEcosystem(networks.destinationChain.id) === 'evm'
        ? utils.getAddress(recipientAddress)
        : recipientAddress,
    );
    if (!destinationTokenAddress) {
      throw new Error('Select a destination token before executing this quote.');
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
    const sourceChainErc20Address =
      tokenOverrides.source?.address ||
      (isDepositMode ? selectedToken?.address : selectedToken?.l2Address);

    const resolution = await resolveLifiTransferStarter({
      route: context,
      wallet: sourceWallet,
      sourceChainId: networks.sourceChain.id,
      destinationChainId: networks.destinationChain.id,
      sourceTokenAddress: sourceChainErc20Address ?? getNativeTokenAddress(networks.sourceChain.id),
      destinationTokenAddress,
      amountBigNumber,
      destinationAddress: recipient,
      confirmDialog,
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
        asset: context.fromAmount.token.symbol,
        assetType: assetType === 'ETH' || assetType === 'SOL' ? AssetType.ETH : AssetType.ERC20,
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
      void Promise.resolve(updatePendingTransaction(cachedLifiTransfer)).catch((error: unknown) => {
        handleError({
          error,
          label: 'lifi_history_update',
          category: 'network_request',
          level: 'warning',
        });
      });
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
        callbacks.notifyError(
          'LiFi transaction execution was interrupted. Check transaction history for its latest status.',
        );
      },
    };

    const transfer = await resolution.transfer(routeCallbacks);

    resetAmountAndSwitchToTransactionHistoryTab();
    clearRoute();

    if (isSmartContractWallet) {
      setTimeout(() => callbacks.highlightHistoryDisclaimer(), 100);
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

    callbacks.onSubmitted();
    if (transfer.waitForSourceConfirmation) {
      void transfer
        .waitForSourceConfirmation()
        .then(refreshCurrentTokenBalances)
        .catch((error: unknown) => {
          handleError({ error, label: 'lifi_source_confirmation', category: 'token_transfer' });
        });
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
    callbacks.notifyError(
      `Lifi transaction failed: ${error instanceof BaseError ? error.shortMessage : error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    setTransferring(false);
  }
}
