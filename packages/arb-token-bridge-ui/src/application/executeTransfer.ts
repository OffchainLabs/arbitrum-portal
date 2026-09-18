import { scaleFrom18DecimalsToNativeTokenDecimals } from '@arbitrum/sdk';
import { TransactionResponse } from '@ethersproject/providers';
import type { RouteExtended } from '@lifi/sdk';
import dayjs from 'dayjs';
import { BigNumber, constants, utils } from 'ethers';
import { BaseError, isHash } from 'viem';

import { getTokenOverride } from '../app/api/crosschain-transfers/utils';
import { highlightTransactionHistoryDisclaimer } from '../components/TransactionHistory/TransactionHistoryDisclaimer';
import { getAmountLoss } from '../components/TransferPanel/HighSlippageWarningDialog';
import { getWarningTokenDescription } from '../components/TransferPanel/TransferPanelUtils';
import {
  convertBridgeSdkToMergedTransaction,
  convertBridgeSdkToPendingDepositTransaction,
} from '../components/TransferPanel/bridgeSdkConversionUtils';
import {
  RouteContext,
  RouteType,
  isLifiRoute,
} from '../components/TransferPanel/hooks/useRouteStore';
import { getAmountToPay } from '../components/TransferPanel/useTransferReadiness';
import { DialogData, DialogType } from '../components/common/Dialog2';
import { errorToast, warningToast } from '../components/common/atoms/Toast';
import { DOCS_DOMAIN } from '../constants';
import { AssetType, DepositGasEstimates, ERC20BridgeToken } from '../hooks/arbTokenBridge.types';
import type { HandleErrorParams } from '../hooks/useError';
import type { NativeCurrency } from '../hooks/useNativeCurrency';
import type { UseNetworksState } from '../hooks/useNetworks';
import { addDepositToCache } from '../services/history';
import type { useAppState } from '../state';
import {
  DepositStatus,
  LifiMergedTransaction,
  MergedTransaction,
  WithdrawalStatus,
} from '../state/app/state';
import { getUsdcTokenAddressFromSourceChainId } from '../state/cctpState';
import { BridgeTransfer, TransferOverrides } from '../token-bridge-sdk/BridgeTransferStarter';
import { BridgeTransferStarterFactory } from '../token-bridge-sdk/BridgeTransferStarterFactory';
import { CctpTransferStarter } from '../token-bridge-sdk/CctpTransferStarter';
import { LifiTransferStarter } from '../token-bridge-sdk/LifiTransferStarter';
import { OftV2TransferStarter } from '../token-bridge-sdk/OftV2TransferStarter';
import { getBridgeTransferProperties } from '../token-bridge-sdk/utils';
import { UiDriverStepExecutor, drive } from '../ui-driver/UiDriver';
import { stepGeneratorForCctp } from '../ui-driver/UiDriverCctp';
import { addressesEqual, normalizeAddress } from '../util/AddressUtils';
import { getLifiAssetType, trackEvent } from '../util/AnalyticsUtils';
import { getLifiRouteToolsDetails } from '../util/LifiRouteUtils';
import { getExecutedLifiRouteTxHash } from '../util/LifiTransactionStatus';
import { isGatewayRegistered, isTokenNativeUSDC } from '../util/TokenUtils';
import { isCctpEnabled } from '../util/featureFlag';
import { isUserRejectedError } from '../util/isUserRejectedError';
import { logger } from '../util/logger';
import { getNetworkName, isNetwork } from '../util/networks';
import { normalizeTimestamp } from '../util/normalizeTimestamp';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import { getEvmExecutionRuntime } from './evmExecutionRuntime';

export type TransferSubmission = {
  networks: Pick<UseNetworksState, 'sourceChain' | 'destinationChain'>;
  childChain: UseNetworksState['sourceChain'];
  parentChain: UseNetworksState['sourceChain'];
  walletAddress: string;
  destinationWalletAddress?: string;
  destinationAddress?: string;
  selectedToken: ERC20BridgeToken | null;
  amount: string;
  amount2: string;
  amountBigNumber: BigNumber;
  selectedRoute: RouteType | undefined;
  context: RouteContext | undefined;
  nativeCurrency: NativeCurrency;
  nativeCurrencyDecimalsOnSourceChain: number;
  warningTokens: ReturnType<typeof useAppState>['app']['warningTokens'];
  isDepositMode: boolean;
  isSmartContractWallet: boolean;
  isBatchTransferSupported: boolean;
  isSwapTransfer: boolean;
  isTransferAllowed: boolean;
  destinationAddressError?: string | null;
};

export type TransferCallbacks = {
  setTransferring: (value: boolean) => void;
  confirmDialog: (type: DialogType, data?: DialogData) => Promise<boolean>;
  confirmCustomDestinationAddress: () => Promise<boolean>;
  firstTimeTokenBridgingConfirmation: () => Promise<boolean>;
  confirmWithdrawal: () => Promise<boolean>;
  showDelayedSmartContractTxRequest: () => void;
  showDelayInSmartContractTransaction: () => void;
  handleError: (params: HandleErrorParams) => void;
  addPendingTransaction: (tx: MergedTransaction) => void;
  updatePendingTransaction: (tx: MergedTransaction) => void;
  addLifiTransactionToCache: (tx: LifiMergedTransaction) => void;
  updateLifiTransactionInCache: (tx: LifiMergedTransaction) => void;
  resetAmountAndSwitchToTransactionHistoryTab: () => void;
  clearRoute: () => void;
  onSubmitted: () => void;
  refreshTokenBalances: (args: { chainId: number; walletAddress: string }) => Promise<unknown>;
};

async function executeEvmTransfer(snapshot: TransferSubmission, callbacks: TransferCallbacks) {
  const {
    networks,
    childChain,
    parentChain,
    walletAddress,
    destinationWalletAddress,
    destinationAddress,
    selectedToken,
    amount,
    amount2,
    amountBigNumber,
    selectedRoute,
    context,
    nativeCurrency,
    nativeCurrencyDecimalsOnSourceChain,
    warningTokens,
    isDepositMode,
    isSmartContractWallet,
    isBatchTransferSupported,
    isSwapTransfer,
    isTransferAllowed,
    destinationAddressError,
  } = snapshot;
  const {
    setTransferring,
    confirmDialog,
    confirmCustomDestinationAddress,
    firstTimeTokenBridgingConfirmation,
    confirmWithdrawal,
    showDelayedSmartContractTxRequest,
    showDelayInSmartContractTransaction,
    handleError,
    addPendingTransaction,
    updatePendingTransaction,
    addLifiTransactionToCache,
    updateLifiTransactionInCache,
    resetAmountAndSwitchToTransactionHistoryTab,
    clearRoute,
    onSubmitted,
    refreshTokenBalances,
  } = callbacks;
  const {
    signer,
    wagmiConfig,
    sourceChainProvider,
    destinationChainProvider,
    assertSigningAccount,
  } = await getEvmExecutionRuntime({
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id,
    expectedAccount: walletAddress,
  });
  const parentChainProvider = isDepositMode ? sourceChainProvider : destinationChainProvider;
  const childChainProvider = isDepositMode ? destinationChainProvider : sourceChainProvider;
  const isBatchTransfer = isBatchTransferSupported && Number(amount2) > 0;
  const isCustomDestinationTransfer = !!destinationAddress;
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
  const signerUndefinedError = 'Signer is undefined';
  const transferNotAllowedError = 'Transfer not allowed';
  const stepExecutor: UiDriverStepExecutor = async (context, step) => {
    logger.debug(step);

    if (step.type === 'return') {
      throw Error(`[stepExecutor] "return" step should be handled outside the executor`);
    }

    switch (step.type) {
      case 'start': {
        setTransferring(true);
        return;
      }

      case 'dialog': {
        return confirmDialog(step.payload);
      }

      case 'scw_tooltip': {
        showDelayedSmartContractTxRequest();
        return;
      }

      case 'tx_ethers': {
        try {
          await assertSigningAccount();
          const tx = await signer.sendTransaction(step.payload.txRequest);
          const txReceipt = await tx.wait();

          return { data: txReceipt };
        } catch (error) {
          // capture error and show toast for anything that's not user rejecting error
          if (!isUserRejectedError(error)) {
            handleError({
              error,
              label: step.payload.txRequestLabel,
              category: 'transaction_signing',
            });

            errorToast(`${(error as Error)?.message ?? error}`);
          }

          return { error: error as unknown as Error };
        }
      }
    }
  };

  const transferCctp = async () => {
    if (!isCctpEnabled()) {
      return warningToast('CCTP V1 transfers are no longer available.');
    }

    if (!selectedToken) {
      return;
    }
    if (!walletAddress) {
      throw new Error(`walletAddress is undefined`);
    }
    if (!signer) {
      throw new Error(signerUndefinedError);
    }
    if (!isTransferAllowed) {
      throw new Error(transferNotAllowedError);
    }

    try {
      const { sourceChain } = networks;

      const cctpTransferStarter = new CctpTransferStarter({
        sourceChainProvider,
        destinationChainProvider,
      });

      const returnEarly = await drive(stepGeneratorForCctp, stepExecutor, {
        amountBigNumber,
        isDepositMode,
        isSmartContractWallet,
        walletAddress,
        destinationAddress,
        transferStarter: cctpTransferStarter,
      });

      // this is only necessary while we are migrating to the ui driver
      // so we can know when to stop the execution of the rest of the function
      //
      // after we are done, we can change the return type of `drive` to `void`
      if (returnEarly) {
        return;
      }

      let depositForBurnTx;

      try {
        if (isSmartContractWallet) {
          showDelayedSmartContractTxRequest();
        }
        await assertSigningAccount();
        const transfer = await cctpTransferStarter.transfer({
          amount: amountBigNumber,
          signer,
          destinationAddress,
          wagmiConfig,
        });
        depositForBurnTx = transfer.sourceChainTransaction;
      } catch (error) {
        if (isUserRejectedError(error)) {
          return;
        }
        handleError({
          error,
          label: 'cctp_transfer',
          category: 'transaction_signing',
        });
        errorToast(
          `USDC ${
            isDepositMode ? 'Deposit' : 'Withdrawal'
          } transaction failed: ${(error as Error)?.message ?? error}`,
        );
      }

      const childChainName = getNetworkName(childChain.id);

      if (!depositForBurnTx) {
        return;
      }

      trackEvent(isDepositMode ? 'CCTP Deposit' : 'CCTP Withdrawal', {
        accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
        network: childChainName,
        amount: Number(amount),
        complete: false,
        version: 2,
      });

      const newTransfer: MergedTransaction = {
        txId: depositForBurnTx.hash,
        asset: 'USDC',
        assetType: AssetType.ERC20,
        blockNum: null,
        createdAt: dayjs().valueOf(),
        direction: isDepositMode ? 'deposit' : 'withdraw',
        isWithdrawal: !isDepositMode,
        resolvedAt: null,
        status: 'pending',
        uniqueId: null,
        value: amount,
        depositStatus: DepositStatus.CCTP_DEFAULT_STATE,
        destination: destinationAddress ?? destinationWalletAddress,
        sender: walletAddress,
        isCctp: true,
        tokenAddress: getUsdcTokenAddressFromSourceChainId(sourceChain.id),
        cctpData: {
          sourceChainId: sourceChain.id,
          attestationHash: null,
          messageBytes: null,
          receiveMessageTransactionHash: null,
          receiveMessageTimestamp: null,
        },
        parentChainId: parentChain.id,
        childChainId: childChain.id,
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id,
      };

      addPendingTransaction(newTransfer);
      setTransferring(false);
      resetAmountAndSwitchToTransactionHistoryTab();
      clearRoute();
      if (isHash(depositForBurnTx.hash))
        await sourceChainProvider.waitForTransaction(depositForBurnTx.hash);
      await refreshCurrentTokenBalances();
    } catch (error) {
      handleError({ error, label: 'cctp_transfer', category: 'transaction_signing' });
    } finally {
      setTransferring(false);
    }
  };

  const transferLifi = async () => {
    try {
      if (!isTransferAllowed) {
        throw new Error(transferNotAllowedError);
      }
      if (!context) {
        return;
      }

      setTransferring(true);

      /**
       * If the amount received is less than 90% of the sent amount, we show a warning dialog
       * We multiply by 100 before dividing to avoid BigNumber stripping the value to 0
       */
      const { fromAmountUsd, toAmountUsd } = getAmountToPay(context);
      const { lossPercentage } = getAmountLoss({
        fromAmount: fromAmountUsd,
        toAmount: toAmountUsd,
      });

      if (lossPercentage > 10) {
        const confirmation = await confirmDialog('high_slippage_warning');
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
      const lifiTransferStarter = new LifiTransferStarter({
        destinationChainProvider,
        sourceChainProvider,
        destinationChainErc20Address,
        sourceChainErc20Address,
        lifiRoute: context,
      });

      if (isSmartContractWallet) {
        showDelayedSmartContractTxRequest();
      }

      let cachedLifiTransfer: LifiMergedTransaction | null = null;
      let latestLifiRoute: RouteExtended | undefined;
      let executedTxHash: string | undefined;
      const updateCachedLifiRoute = (lifiRoute: RouteExtended) => {
        latestLifiRoute = lifiRoute;
        const txHash = getExecutedLifiRouteTxHash(lifiRoute);

        if (!executedTxHash && txHash) {
          executedTxHash = txHash;
          resetAmountAndSwitchToTransactionHistoryTab();
          clearRoute();

          if (isSmartContractWallet) {
            // show the warning in case of SCW since we cannot show Lifi tx history for SCW
            setTimeout(() => {
              highlightTransactionHistoryDisclaimer();
            }, 100);
          }
        }

        if (!cachedLifiTransfer) {
          return;
        }

        cachedLifiTransfer = {
          ...cachedLifiTransfer,
          ...(txHash ? { txId: txHash } : {}),
          lifiRoute,
        };
        updatePendingTransaction(cachedLifiTransfer);
        updateLifiTransactionInCache(cachedLifiTransfer);
      };

      const transfer = await lifiTransferStarter.transfer({
        amount: amountBigNumber,
        destinationAddress,
        wagmiConfig,
        onApprovalRequest: (approvalRequest) =>
          confirmDialog('approve_lifi_token', { lifiApproval: { approvalRequest } }),
        onRouteUpdate: updateCachedLifiRoute,
        onRouteExecutionComplete: () => {
          void refreshCurrentTokenBalances();
        },
        onRouteExecutionError: (error) => {
          void refreshCurrentTokenBalances();
          handleError({
            error,
            label: 'lifi_route_execution',
            category: 'token_transfer',
          });
          errorToast(
            'LiFi transaction execution was interrupted. Check transaction history for its latest status.',
          );
        },
      });

      const assetType = getLifiAssetType({
        tokenAddress: context.fromAmount.token.address,
        chainId: networks.sourceChain.id,
      });
      const destinationAssetType = getLifiAssetType({
        tokenAddress: context.toAmount.token.address,
        chainId: networks.destinationChain.id,
      });

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

      const lifiRoute = latestLifiRoute ?? transfer.lifiRoute;

      if (!isSmartContractWallet) {
        const assetType =
          !selectedToken ||
          (selectedToken && addressesEqual(selectedToken.address, constants.AddressZero))
            ? AssetType.ETH
            : AssetType.ERC20;
        const toolsDetails = getLifiRouteToolsDetails(context.protocolData.route);
        const txId = getExecutedLifiRouteTxHash(lifiRoute) ?? transfer.sourceChainTransaction.hash;

        const newTransfer: LifiMergedTransaction = {
          txId,
          asset: selectedToken?.symbol || 'ETH',
          assetType,
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
          tokenAddress: selectedToken?.address || constants.AddressZero,
          parentChainId: parentChain.id,
          childChainId: childChain.id,
          sourceChainId: networks.sourceChain.id,
          destinationChainId: networks.destinationChain.id,
          toolDetails: toolsDetails[0],
          toolsDetails,
          durationMs: context.durationMs,
          fromAmount: {
            ...context.fromAmount,
          },
          toAmount: {
            ...context.toAmount,
          },
          destinationTxId: null,
          lifiRoute,
        };
        cachedLifiTransfer = newTransfer;
        addPendingTransaction(newTransfer);
        addLifiTransactionToCache(newTransfer);
      }

      const sourceChainTransaction = transfer.sourceChainTransaction;
      if ('wait' in sourceChainTransaction) {
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
        `Lifi transaction failed: ${error instanceof BaseError ? error.shortMessage : (error as Error).message}`,
      );
    } finally {
      setTransferring(false);
    }
  };

  const transferOft = async () => {
    if (!selectedToken) {
      return;
    }
    if (!signer) {
      throw new Error(signerUndefinedError);
    }
    if (!isTransferAllowed) {
      throw new Error(transferNotAllowedError);
    }

    setTransferring(true);

    try {
      if (!(await confirmCustomDestinationAddress())) {
        return;
      }

      const oftTransferStarter = new OftV2TransferStarter({
        sourceChainProvider,
        sourceChainErc20Address: isDepositMode ? selectedToken.address : selectedToken?.l2Address,
        destinationChainProvider,
      });

      const isTokenApprovalRequired = await oftTransferStarter.requiresTokenApproval({
        amount: amountBigNumber,
        owner: await signer.getAddress(),
      });

      if (isTokenApprovalRequired) {
        const userConfirmation = await confirmDialog('approve_token');
        if (!userConfirmation) return false;

        if (isSmartContractWallet) {
          showDelayedSmartContractTxRequest();
        }

        try {
          const tx = await oftTransferStarter.approveToken({
            signer,
            amount: amountBigNumber,
          });
          await tx.wait();
        } catch (error) {
          if (isUserRejectedError(error)) {
            return;
          }
          handleError({
            error,
            label: 'oft_approve_token',
            category: 'token_approval',
          });
          errorToast(
            `OFT token approval transaction failed: ${(error as Error)?.message ?? error}`,
          );
          return;
        }
      }

      if (isSmartContractWallet) {
        showDelayedSmartContractTxRequest();
      }

      await assertSigningAccount();
      const transfer = await oftTransferStarter.transfer({
        amount: amountBigNumber,
        signer,
        destinationAddress,
        wagmiConfig,
      });

      trackEvent('OFT Transfer', {
        tokenSymbol: selectedToken.symbol,
        assetType: 'ERC-20',
        accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
        network: getNetworkName(networks.sourceChain.id),
        amount: Number(amount),
        sourceChain: getNetworkName(networks.sourceChain.id),
        destinationChain: getNetworkName(networks.destinationChain.id),
      });

      resetAmountAndSwitchToTransactionHistoryTab();

      if (isSmartContractWallet) {
        // show the warning in case of SCW since we don't cannot show OFT tx history
        setTimeout(() => {
          highlightTransactionHistoryDisclaimer();
        }, 100);
      } else {
        // for EOA, show the transaction in tx history
        addPendingTransaction({
          isOft: true,
          isCctp: false,
          sender: walletAddress,
          direction: isDepositMode ? 'deposit' : 'withdraw',
          status: 'pending',
          createdAt: dayjs().valueOf(),
          resolvedAt: null,
          txId: transfer.sourceChainTransaction.hash.toLowerCase(),
          assetType: AssetType.ERC20,
          uniqueId: null,
          isWithdrawal: !isDepositMode,
          blockNum: null,
          childChainId: childChain.id,
          parentChainId: parentChain.id,
          sourceChainId: networks.sourceChain.id,
          destinationChainId: networks.destinationChain.id,
          asset: selectedToken.symbol,
          value: amount,
          tokenAddress: selectedToken.address,
        });
      }

      clearRoute();
      if (isHash(transfer.sourceChainTransaction.hash))
        await sourceChainProvider.waitForTransaction(transfer.sourceChainTransaction.hash);
      await refreshCurrentTokenBalances();
    } catch (error) {
      if (isUserRejectedError(error)) {
        return;
      }
      handleError({
        error,
        label: 'oft_transfer',
        category: 'transaction_signing',
      });
      logger.error(error);
      errorToast(
        `OFT ${isDepositMode ? 'Deposit' : 'Withdrawal'} transaction failed: ${
          (error as Error)?.message ?? error
        }`,
      );
    } finally {
      setTransferring(false);
    }
  };

  const transfer = async () => {
    const sourceChainId = networks.sourceChain.id;

    if (!isTransferAllowed) {
      throw new Error(transferNotAllowedError);
    }

    if (!signer) {
      throw new Error(signerUndefinedError);
    }

    const childChainName = getNetworkName(childChain.id);

    setTransferring(true);

    try {
      const warningToken = selectedToken && warningTokens[normalizeAddress(selectedToken.address)];
      if (warningToken) {
        const description = getWarningTokenDescription(warningToken.type);
        warningToast(
          `${selectedToken?.address} is ${description}; it will likely have unusual behavior when deployed as as standard token to Arbitrum. It is not recommended that you deploy it. (See ${DOCS_DOMAIN}/for-devs/concepts/token-bridge/token-bridge-erc20 for more info.)`,
        );
        return;
      }

      const destinationChainId = networks.destinationChain.id;

      const sourceChainErc20Address = isDepositMode
        ? selectedToken?.address
        : selectedToken?.l2Address;

      const destinationChainErc20Address = isDepositMode
        ? selectedToken?.l2Address
        : selectedToken?.address;

      const bridgeTransferStarter = BridgeTransferStarterFactory.create({
        sourceChainId,
        sourceChainErc20Address,
        destinationChainId,
        destinationChainErc20Address,
      });

      const { isWithdrawal, isDeposit } = getBridgeTransferProperties({
        sourceChainId,
        sourceChainErc20Address,
        destinationChainId,
      });

      if (isDeposit && isTokenNativeUSDC(selectedToken?.address)) {
        const depositConfirmation = await confirmDialog('confirm_usdc_deposit');
        if (!depositConfirmation) return;
      }

      if (isWithdrawal && selectedToken && !sourceChainErc20Address) {
        /*
        just a fail-safe - since our types allow for an optional `selectedToken?.l2Address`, we can theoretically end up with a case
        where user is trying to make an ERC-20 withdrawal but passing `sourceChainErc20Address` as undefined, ending up with
        the SDK to initialize wrongly and make an ETH withdrawal instead. To summarize:
        - if it's a withdrawal
        - if a token is selected
        - but the token's address on the child chain is not found (ie. sourceChainErc20Address)
      */
        throw Error('Source chain token address not found for ERC-20 withdrawal.');
      }

      if (destinationAddressError) {
        logger.error(destinationAddressError);
        return;
      }

      if (!(await confirmCustomDestinationAddress())) {
        return;
      }

      const isCustomNativeTokenAmount2 =
        nativeCurrency.isCustom && isBatchTransferSupported && Number(amount2) > 0;

      const isNativeCurrencyApprovalRequired =
        await bridgeTransferStarter.requiresNativeCurrencyApproval({
          signer,
          amount: amountBigNumber,
          destinationAddress,
          options: {
            approvalAmountIncrease: isCustomNativeTokenAmount2
              ? utils.parseUnits(amount2, nativeCurrencyDecimalsOnSourceChain)
              : undefined,
          },
        });

      if (isNativeCurrencyApprovalRequired) {
        // show native currency approval dialog
        const userConfirmation = await confirmDialog('approve_custom_fee_token');
        if (!userConfirmation) return false;

        await assertSigningAccount();
        const approvalTx = await bridgeTransferStarter.approveNativeCurrency({
          signer,
          amount: amountBigNumber,
          destinationAddress,
          options: {
            approvalAmountIncrease: isCustomNativeTokenAmount2
              ? utils.parseUnits(amount2, nativeCurrencyDecimalsOnSourceChain)
              : undefined,
          },
        });

        if (approvalTx) {
          await approvalTx.wait();
        }
      }

      // checks for the selected token
      if (selectedToken) {
        const tokenAddress = selectedToken.address;

        // is selected token deployed on parent-chain?
        if (!tokenAddress) Error('Token not deployed on source chain.');

        // warning token handling
        const warningToken = warningTokens[normalizeAddress(selectedToken.address)];
        if (warningToken) {
          const description = getWarningTokenDescription(warningToken.type);
          warningToast(
            `${selectedToken?.address} is ${description}; it will likely have unusual behavior when deployed as as standard token to Arbitrum. It is not recommended that you deploy it. (See ${DOCS_DOMAIN}/for-devs/concepts/token-bridge/token-bridge-erc20 for more info.)`,
          );
          return;
        }

        // token suspension handling
        const isTokenSuspended = !(await isGatewayRegistered({
          erc20ParentChainAddress: selectedToken.address,
          parentChainProvider,
          childChainProvider,
        }));
        if (isTokenSuspended) {
          warningToast(
            'Depositing is currently suspended for this token as a new gateway is being registered. Please try again later and contact support if this issue persists.',
          );
          return;
        }

        // if token is being bridged for first time, it will need to be registered in gateway
        const userConfirmationForFirstTimeTokenBridging =
          await firstTimeTokenBridgingConfirmation();
        if (!userConfirmationForFirstTimeTokenBridging) {
          throw Error('User declined bridging the token for the first time');
        }
      }

      // if withdrawal (and not smart-contract-wallet), confirm from user about the delays involved
      if (isWithdrawal && !isSmartContractWallet) {
        const withdrawalConfirmation = await confirmWithdrawal();
        if (!withdrawalConfirmation) return false;
      }

      // token approval
      if (selectedToken) {
        const isTokenApprovalRequired = await bridgeTransferStarter.requiresTokenApproval({
          amount: amountBigNumber,
          owner: await signer.getAddress(),
          destinationAddress,
        });
        if (isTokenApprovalRequired) {
          const userConfirmation = await confirmDialog('approve_token');
          if (!userConfirmation) return false;

          if (isSmartContractWallet && isWithdrawal) {
            showDelayInSmartContractTransaction();
          }
          await assertSigningAccount();
          const approvalTx = await bridgeTransferStarter.approveToken({
            signer,
            amount: amountBigNumber,
          });

          if (approvalTx) {
            await approvalTx.wait();
          }
        }
      }

      // show a delay in case of SCW because tx is executed in an external app
      if (isSmartContractWallet) {
        showDelayInSmartContractTransaction();

        trackEvent(isDepositMode ? 'Deposit' : 'Withdraw', {
          tokenSymbol: selectedToken?.symbol,
          assetType: 'ERC-20',
          accountType: 'Smart Contract',
          network: childChainName,
          amount: Number(amount),
          amount2: isBatchTransfer ? Number(amount2) : undefined,
        });
      }

      const overrides: TransferOverrides = {};

      if (isBatchTransfer) {
        // when sending additional ETH with ERC-20, we add the additional ETH value as maxSubmissionCost
        const gasEstimates = (await bridgeTransferStarter.transferEstimateGas({
          amount: amountBigNumber,
          from: await signer.getAddress(),
          destinationAddress,
        })) as DepositGasEstimates;

        if (!gasEstimates.estimatedChildChainSubmissionCost) {
          errorToast('Failed to estimate deposit maxSubmissionCost');
          throw 'Failed to estimate deposit maxSubmissionCost';
        }

        overrides.maxSubmissionCost = utils
          // we are not scaling these to native decimals because arbitrum-sdk does it for us
          .parseEther(amount2)
          .add(gasEstimates.estimatedChildChainSubmissionCost);
        overrides.excessFeeRefundAddress = destinationAddress;
      }

      // finally, call the transfer function
      await assertSigningAccount();
      const transfer = await bridgeTransferStarter.transfer({
        amount: amountBigNumber,
        signer,
        destinationAddress,
        overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
      });

      // transaction submitted callback
      await onTxSubmit(transfer);
    } catch (error) {
      handleError({
        error,
        label: 'arbitrum_transfer',
        category: 'transaction_signing',
        additionalData: selectedToken
          ? {
              erc20_address_on_parent_chain: selectedToken.address,
              transfer_type: 'token',
            }
          : { transfer_type: 'native currency' },
      });
    } finally {
      setTransferring(false);
    }
  };

  const onTxSubmit = async (bridgeTransfer: BridgeTransfer) => {
    if (!walletAddress) return; // at this point, walletAddress will always be defined, we just have this to avoid TS checks in this function

    if (!isSmartContractWallet) {
      trackEvent(isDepositMode ? 'Deposit' : 'Withdraw', {
        tokenSymbol: selectedToken?.symbol,
        assetType: selectedToken ? 'ERC-20' : 'ETH',
        accountType: 'EOA',
        network: getNetworkName(childChain.id),
        amount: Number(amount),
        amount2: isBatchTransfer ? Number(amount2) : undefined,
        isCustomDestinationTransfer,
        parentChainErc20Address: selectedToken?.address,
      });
    }

    const { sourceChainTransaction } = bridgeTransfer;

    const timestampCreated = String(normalizeTimestamp(Date.now()));

    const { isOrbitChain: isSourceOrbitChain } = isNetwork(networks.sourceChain.id);

    // only scale for native tokens, and
    // only scale if sent from Orbit, because it's always 18 decimals there but the UI needs scaled amount
    const scaledAmount = scaleFrom18DecimalsToNativeTokenDecimals({
      amount: amountBigNumber,
      decimals: nativeCurrency.decimals,
    });

    const isNativeTokenWithdrawalFromOrbit = !selectedToken && isSourceOrbitChain;

    const txHistoryCompatibleObject = convertBridgeSdkToMergedTransaction({
      bridgeTransfer,
      parentChainId: parentChain.id,
      childChainId: childChain.id,
      selectedToken,
      walletAddress,
      destinationAddress,
      nativeCurrency,
      amount: isNativeTokenWithdrawalFromOrbit ? scaledAmount : amountBigNumber,
      amount2: isBatchTransfer ? utils.parseEther(amount2) : undefined,
      timestampCreated,
    });

    // add transaction to the transaction history
    addPendingTransaction(txHistoryCompatibleObject);

    // if deposit, add to local cache
    if (isDepositMode) {
      addDepositToCache(
        convertBridgeSdkToPendingDepositTransaction({
          bridgeTransfer,
          parentChainId: parentChain.id,
          childChainId: childChain.id,
          selectedToken,
          walletAddress,
          destinationAddress,
          nativeCurrency,
          amount: isNativeTokenWithdrawalFromOrbit ? scaledAmount : amountBigNumber,
          amount2: isBatchTransfer ? utils.parseEther(amount2) : undefined,
          timestampCreated,
        }),
      );
    }

    onSubmitted();
    setTransferring(false);
    clearRoute();

    await (sourceChainTransaction as TransactionResponse).wait();

    // tx confirmed, update balances
    await refreshCurrentTokenBalances();
  };

  if (selectedRoute === 'oftV2') return transferOft();
  if (selectedRoute === 'cctp') return transferCctp();
  if (isLifiRoute(selectedRoute)) return transferLifi();
  if (
    selectedRoute === 'arbitrum' &&
    isDepositMode &&
    selectedToken &&
    !(await firstTimeTokenBridgingConfirmation())
  )
    return;
  return transfer();
}

export async function executeTransfer(
  snapshot: TransferSubmission,
  callbacks: TransferCallbacks,
  implementations: Record<
    string,
    ((snapshot: TransferSubmission, callbacks: TransferCallbacks) => Promise<unknown>) | undefined
  > = { evm: executeEvmTransfer },
  ecosystemForChain: (chainId: number) => string = getWalletEcosystem,
) {
  const execute = implementations[ecosystemForChain(snapshot.networks.sourceChain.id)];
  if (!execute) throw new Error('Transfer execution is unavailable for this ecosystem.');
  return execute(snapshot, callbacks);
}
