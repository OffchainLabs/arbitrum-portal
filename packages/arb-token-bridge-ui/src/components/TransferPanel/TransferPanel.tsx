import { constants } from 'ethers';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLatest } from 'react-use';
import { twMerge } from 'tailwind-merge';
import { shallow } from 'zustand/shallow';

import { Tooltip } from '@/app/components/common/Tooltip';
import { useNativeCurrency } from '@/bridge/hooks/useNativeCurrency';
import { useNetworks } from '@/bridge/hooks/useNetworks';
import { useNetworksRelationship } from '@/bridge/hooks/useNetworksRelationship';
import { useAddPendingTransactions } from '@/bridge/hooks/useTransactionHistory';
import { isEmbeddedBridgeBuyOrSubpages } from '@/bridge/util/pathnameUtils';

import { executeTransfer, switchTransferNetwork } from '../../application/executeTransfer';
import { GET_HELP_LINK } from '../../constants';
import { useIsBatchTransferSupported } from '../../hooks/TransferPanel/useIsBatchTransferSupported';
import { useAccountType } from '../../hooks/useAccountType';
import { TabParamEnum, tabToIndex, useArbQueryParams } from '../../hooks/useArbQueryParams';
import { useError } from '../../hooks/useError';
import { useIsTrustWalletConnection } from '../../hooks/useIsTrustWalletConnection';
import { useLifiMergedTransactionCacheStore } from '../../hooks/useLifiMergedTransactionCacheStore';
import { useMode } from '../../hooks/useMode';
import { useSelectedToken } from '../../hooks/useSelectedToken';
import { useSourceChainNativeCurrencyDecimals } from '../../hooks/useSourceChainNativeCurrencyDecimals';
import { useTokenLists } from '../../hooks/useTokenLists';
import { useAppState } from '../../state';
import { ChainId } from '../../types/ChainId';
import { addressesEqual } from '../../util/AddressUtils';
import { trackEvent } from '../../util/AnalyticsUtils';
import { isNovaDestination } from '../../util/NovaUtils';
import { isTokenNativeUSDC } from '../../util/TokenUtils';
import { isUserRejectedError } from '../../util/isUserRejectedError';
import { getNetworkName } from '../../util/networks';
import { isOnrampFeatureEnabled } from '../../util/queryParamUtils';
import { useRefreshTokenBalances } from '../../wallet/hooks/useTokenBalances';
import { useWallets } from '../../wallet/hooks/useWallets';
import { useAppContextActions } from '../App/AppContext';
import { WidgetBuyPanel } from '../Widget/WidgetBuyPanel';
import { WidgetTransferPanel } from '../Widget/WidgetTransferPanel';
import { useDialog } from '../common/Dialog';
import { DialogData, DialogType, DialogWrapper, useDialog2 } from '../common/Dialog2';
import { ExternalLink } from '../common/ExternalLink';
import { warningToast } from '../common/atoms/Toast';
import { ConnectWalletButton } from './ConnectWalletButton';
import { MoveFundsButton } from './MoveFundsButton';
import { ReceiveFundsHeader } from './ReceiveFundsHeader';
import { Routes } from './Routes/Routes';
import { ToSConfirmationCheckbox } from './ToSConfirmationCheckbox';
import { TokenDepositCheckDialogType } from './TokenDepositCheckDialog';
import { TokenImportDialog, useTokenImportDialogStore } from './TokenImportDialog';
import { useTokensFromLists, useTokensFromUser } from './TokenSearchUtils';
import { TransferPanelMain } from './TransferPanelMain';
import { ImportTokenModalStatus } from './TransferPanelUtils';
import { useAmountBigNumber } from './hooks/useAmountBigNumber';
import { useDestinationAddressError } from './hooks/useDestinationAddressError';
import { useIsSwapTransfer } from './hooks/useIsSwapTransfer';
import { useIsTransferAllowed } from './hooks/useIsTransferAllowed';
import { getSelectedRouteContext, useRouteStore } from './hooks/useRouteStore';

const networkConnectionWarningToast = () =>
  warningToast(
    <>
      Network connection issue. Please contact{' '}
      <ExternalLink href={GET_HELP_LINK} className="underline">
        support
      </ExternalLink>
      .
    </>,
    { autoClose: false },
  );

export function TransferPanel({
  execute = executeTransfer,
  switchNetwork = switchTransferNetwork,
}: { execute?: typeof executeTransfer; switchNetwork?: typeof switchTransferNetwork } = {}) {
  // Link the amount state directly to the amount in query params -  no need of useState
  // Both `amount` getter and setter will internally be using `useArbQueryParams` functions
  const [
    {
      amount,
      amount2,
      destinationAddress,
      token: tokenFromSearchParams,
      destinationToken,
      disabledFeatures,
    },
    setQueryParams,
  ] = useArbQueryParams();
  const showBuyPanel = isOnrampFeatureEnabled({ disabledFeatures });
  const pathname = usePathname();
  const { embedMode } = useMode();
  const [importTokenModalStatus, setImportTokenModalStatus] = useState<ImportTokenModalStatus>(
    ImportTokenModalStatus.IDLE,
  );
  const [showSmartContractWalletTooltip, setShowSmartContractWalletTooltip] = useState(false);
  const {
    app: {
      arbTokenBridge: { bridgeTokens },
      warningTokens,
    },
  } = useAppState();
  const { sourceWallet, destinationWallet } = useWallets();
  const walletAddress = sourceWallet.account.address;
  const destinationWalletAddress = destinationWallet.account.address;
  const isConnected = sourceWallet.isConnected;
  const [selectedToken, setSelectedToken] = useSelectedToken();
  const hasTrackedBridgePageLoad = useRef(false);

  const latestChainId = useLatest(sourceWallet.account.chainId);
  const [networks, setNetworks] = useNetworks();
  const latestNetworks = useLatest(networks);
  const { data: tokensFromLists } = useTokensFromLists();
  const tokensFromUser = useTokensFromUser();
  const {
    current: { childChain, parentChain, isDepositMode },
  } = useLatest(useNetworksRelationship(latestNetworks.current));
  const { isLoading: isLoadingTokenLists } = useTokenLists(childChain.id);
  const isBatchTransferSupported = useIsBatchTransferSupported();
  const nativeCurrencyDecimalsOnSourceChain = useSourceChainNativeCurrencyDecimals();

  const nativeCurrency = useNativeCurrency({ chainId: childChain.id });

  const { accountType } = useAccountType();
  const isSmartContractWallet = accountType === 'smart-contract-wallet';

  const isTrustWalletConnection = useIsTrustWalletConnection();

  const submissionInProgress = useRef(false);

  const { setTransferring } = useAppContextActions();
  const { addPendingTransaction, updatePendingTransaction } =
    useAddPendingTransactions(walletAddress);
  const { selectedRoute, clearRoute, context } = useRouteStore(
    (state) => ({
      selectedRoute: state.selectedRoute,
      clearRoute: state.clearRoute,
      context: getSelectedRouteContext(state),
    }),
    shallow,
  );
  const {
    addLifiTransactionToCache,
    updateLifiTransactionInCache,
    removeLifiTransactionFromCache,
  } = useLifiMergedTransactionCacheStore(
    (state) => ({
      addLifiTransactionToCache: state.addTransaction,
      updateLifiTransactionInCache: state.updateTransaction,
      removeLifiTransactionFromCache: state.removeTransaction,
    }),
    shallow,
  );

  const isTransferAllowed = useLatest(useIsTransferAllowed());

  const isSwapTransfer = useIsSwapTransfer();

  const latestDestinationAddress = useLatest(destinationAddress);

  const [dialogProps, openDialog] = useDialog2();

  const [tokenImportDialogProps] = useDialog();

  const openTokenImportDialog = useTokenImportDialogStore((state) => state.openDialog);

  const isCustomDestinationTransfer = !!latestDestinationAddress.current;

  const refreshTokenBalances = useRefreshTokenBalances();
  const { destinationAddressError } = useDestinationAddressError();

  const isBatchTransfer = isBatchTransferSupported && Number(amount2) > 0;

  const { handleError } = useError();

  useEffect(() => {
    if (hasTrackedBridgePageLoad.current) {
      return;
    }

    hasTrackedBridgePageLoad.current = true;
    trackEvent('Bridge Page Loaded', {
      sourceChainId: networks.sourceChain.id,
      destinationChainId: networks.destinationChain.id,
      sourceToken: tokenFromSearchParams,
      destinationToken,
    });
  }, [
    destinationToken,
    networks.destinationChain.id,
    networks.sourceChain.id,
    tokenFromSearchParams,
  ]);

  const resetAmountAndSwitchToTransactionHistoryTab = useCallback(() => {
    setQueryParams({
      tab: tabToIndex[TabParamEnum.TX_HISTORY],
      amount: '',
      amount2: '',
    });
  }, [setQueryParams]);

  useEffect(() => {
    if (importTokenModalStatus !== ImportTokenModalStatus.IDLE) {
      return;
    }

    openTokenImportDialog();
  }, [importTokenModalStatus, openTokenImportDialog]);

  function closeWithResetTokenImportDialog() {
    setSelectedToken(null);
    setImportTokenModalStatus(ImportTokenModalStatus.CLOSED);
    tokenImportDialogProps.onClose(false);
  }

  const isTokenAlreadyImported = useMemo(() => {
    if (typeof tokenFromSearchParams === 'undefined') {
      return true;
    }

    if (isTokenNativeUSDC(tokenFromSearchParams)) {
      return true;
    }

    if (addressesEqual(tokenFromSearchParams, constants.AddressZero)) {
      return true;
    }

    if (isLoadingTokenLists) {
      return undefined;
    }

    // only show import token dialog if the token is not part of the list
    // otherwise we show a loader in the TokenButton
    if (!tokensFromLists) {
      return undefined;
    }

    if (!tokensFromUser) {
      return undefined;
    }

    return (
      typeof bridgeTokens?.[tokenFromSearchParams] !== 'undefined' ||
      typeof tokensFromLists[tokenFromSearchParams] !== 'undefined' ||
      typeof tokensFromUser[tokenFromSearchParams] !== 'undefined'
    );
  }, [bridgeTokens, isLoadingTokenLists, tokenFromSearchParams, tokensFromLists, tokensFromUser]);

  const shouldShowTokenImportDialog =
    isTokenAlreadyImported === false && typeof tokenFromSearchParams !== 'undefined';

  const isBridgingANewStandardToken = useMemo(() => {
    const isUnbridgedToken =
      selectedToken !== null && typeof selectedToken.l2Address === 'undefined';

    return isDepositMode && isUnbridgedToken;
  }, [isDepositMode, selectedToken]);

  const areSenderAndCustomDestinationAddressesEqual = useMemo(
    () => addressesEqual(destinationAddress, walletAddress),
    [destinationAddress, walletAddress],
  );

  const { current: amountBigNumber } = useLatest(useAmountBigNumber());

  const confirmDialog = async (dialogType: DialogType, dialogData?: DialogData) => {
    const waitForInput = openDialog(dialogType, dialogData);
    const [confirmed] = await waitForInput();
    return confirmed;
  };

  const confirmTrustWalletUpdate = async () => {
    if (!isTrustWalletConnection) {
      return true;
    }

    const confirmed = await confirmDialog('trust_wallet_update');
    trackEvent('Trust Wallet Update Confirmation', { confirmed });

    return confirmed;
  };

  const confirmNovaDepositWarning = async () => {
    const waitForInput = openDialog('nova_deposit_warning');
    const [confirmed] = await waitForInput();

    if (!confirmed) {
      setNetworks({
        sourceChainId: latestNetworks.current.sourceChain.id,
        destinationChainId: ChainId.ArbitrumOne,
      });
      return false;
    }

    return true;
  };

  const showDelayInSmartContractTransaction = () => {
    // a custom 3 second delay to show a tooltip after SC transaction goes through
    // to give a visual feedback to the user that something happened
    setTimeout(() => {
      setShowSmartContractWalletTooltip(true);
    }, 3000);
    return true;
  };

  function getDialogType(): TokenDepositCheckDialogType | null {
    if (isBridgingANewStandardToken) {
      return 'deposit_token_new_token';
    }

    const isUserAddedToken =
      selectedToken &&
      selectedToken?.listIds.size === 0 &&
      typeof selectedToken.l2Address === 'undefined';

    return isUserAddedToken ? 'deposit_token_user_added_token' : null;
  }

  const firstTimeTokenBridgingConfirmation = async () => {
    // Check if we need to show `TokenDepositCheckDialog` for first-time bridging
    const dialogType = getDialogType();
    if (dialogType) {
      const confirmed = await confirmDialog(dialogType);
      return confirmed;
    }

    // else pass the check
    return true;
  };

  const confirmWithdrawal = async () => {
    const waitForInput = openDialog('withdraw');
    const [confirmed] = await waitForInput();
    return confirmed;
  };

  // SC wallet transfer requests are sent immediately, delay it to give user an impression of a tx sent
  const showDelayedSmartContractTxRequest = () =>
    setTimeout(() => {
      setTransferring(false);
      setShowSmartContractWalletTooltip(true);
    }, 3000);

  const confirmCustomDestinationAddress = async () => {
    // confirm if the user is certain about the custom destination address, especially if it matches the connected SCW address.
    // this ensures that user funds do not end up in the destination chain's address that matches their source-chain wallet address, which they may not control.
    if (isSmartContractWallet && areSenderAndCustomDestinationAddressesEqual) {
      return confirmDialog('scw_custom_destination_address');
    }

    return true;
  };

  const trackTransferButtonClick = useCallback(() => {
    trackEvent('Transfer Button Click', {
      type: isDepositMode ? 'Deposit' : 'Withdrawal',
      selectedRoute,
      tokenSymbol: selectedToken?.symbol,
      assetType: selectedToken ? 'ERC-20' : 'ETH',
      accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
      network: childChain.name,
      amount: Number(amount),
      amount2: isBatchTransfer ? Number(amount2) : undefined,
      isCustomDestinationTransfer,
      parentChainErc20Address: selectedToken?.address,
    });
  }, [
    amount,
    amount2,
    childChain.name,
    isBatchTransfer,
    isDepositMode,
    isSmartContractWallet,
    selectedToken,
    isCustomDestinationTransfer,
    selectedRoute,
  ]);

  const submitTransfer = async () => {
    const isConnectedToTheWrongChain =
      latestChainId.current !== latestNetworks.current.sourceChain.id;

    const sourceChainId = latestNetworks.current.sourceChain.id;
    const childChainName = getNetworkName(childChain.id);
    const isBatchTransfer = isBatchTransferSupported && Number(amount2) > 0;

    trackTransferButtonClick();

    try {
      setTransferring(true);
      if (isConnectedToTheWrongChain) {
        trackEvent('Switch Network and Transfer', {
          type: isDepositMode ? 'Deposit' : 'Withdrawal',
          tokenSymbol: selectedToken?.symbol,
          assetType: selectedToken ? 'ERC-20' : 'ETH',
          accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
          network: childChainName,
          amount: Number(amount),
          amount2: isBatchTransfer ? Number(amount2) : undefined,
          version: 2,
        });
        await switchNetwork(sourceChainId);
      }
    } catch (error) {
      if (isUserRejectedError(error)) {
        return;
      }
      return networkConnectionWarningToast();
    } finally {
      setTransferring(false);
    }

    if (!isTransferAllowed.current) {
      return networkConnectionWarningToast();
    }

    if (isNovaDestination(latestNetworks.current.destinationChain.id)) {
      const shouldProceedToNova = await confirmNovaDepositWarning();

      if (!shouldProceedToNova) {
        return;
      }
    }

    if (!(await confirmTrustWalletUpdate())) {
      return;
    }

    if (!walletAddress) return;
    await execute(
      {
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
        isTransferAllowed: isTransferAllowed.current,
        destinationAddressError,
      },
      {
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
        removeLifiTransactionFromCache,
        resetAmountAndSwitchToTransactionHistoryTab,
        clearRoute,
        refreshTokenBalances,
        onSubmitted: () => {
          if (embedMode) openDialog('widget_transaction_history');
          setQueryParams({ tab: tabToIndex[TabParamEnum.TX_HISTORY], amount: '', amount2: '' });
        },
      },
    );
  };

  const moveFundsButtonOnClick = async () => {
    if (submissionInProgress.current) return;
    submissionInProgress.current = true;
    try {
      await submitTransfer();
    } catch (error) {
      handleError({ error, label: 'transfer', category: 'transaction_signing' });
    } finally {
      submissionInProgress.current = false;
    }
  };

  if (embedMode) {
    if (isEmbeddedBridgeBuyOrSubpages(pathname) && showBuyPanel) {
      return <WidgetBuyPanel openDialog={openDialog} dialogProps={dialogProps} />;
    }

    return (
      <WidgetTransferPanel
        openDialog={openDialog}
        dialogProps={dialogProps}
        moveFundsButtonOnClick={moveFundsButtonOnClick}
        shouldShowTokenImportDialog={shouldShowTokenImportDialog}
        tokenFromSearchParams={tokenFromSearchParams}
        tokenImportDialogProps={tokenImportDialogProps}
        closeWithResetTokenImportDialog={closeWithResetTokenImportDialog}
      />
    );
  }

  return (
    <>
      <DialogWrapper {...dialogProps} />

      <div
        className={twMerge(
          'bg-gray-1 mb-7 flex flex-col border-0 rounded gap-4 p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.2)]',
        )}
      >
        <TransferPanelMain />

        <ReceiveFundsHeader />

        <Routes />

        <ToSConfirmationCheckbox />

        {showSmartContractWalletTooltip ? (
          <Tooltip
            content={
              <div className="flex flex-col">
                <span>
                  <b>To continue, please approve tx on your smart contract wallet.</b>
                </span>
                <span>If you have k of n signers, then k of n will need to sign.</span>
              </div>
            }
            wrapperClassName="w-full"
            tooltipProps={{
              open: showSmartContractWalletTooltip,
              onOpenChange: setShowSmartContractWalletTooltip,
            }}
            contentProps={{
              side: 'bottom',
              align: 'center',
              className: 'max-w-none rounded-[5px] bg-[#ffeed3] px-3 py-2 text-sm text-[#60461f]',
              onPointerDownOutside: () => setShowSmartContractWalletTooltip(false),
              onEscapeKeyDown: () => setShowSmartContractWalletTooltip(false),
            }}
          >
            {isConnected ? (
              <MoveFundsButton onClick={moveFundsButtonOnClick} />
            ) : (
              <ConnectWalletButton />
            )}
          </Tooltip>
        ) : isConnected ? (
          <MoveFundsButton onClick={moveFundsButtonOnClick} />
        ) : (
          <ConnectWalletButton />
        )}

        {shouldShowTokenImportDialog && tokenFromSearchParams && (
          <TokenImportDialog
            {...tokenImportDialogProps}
            onClose={closeWithResetTokenImportDialog}
            tokenAddress={tokenFromSearchParams}
          />
        )}
      </div>
    </>
  );
}
