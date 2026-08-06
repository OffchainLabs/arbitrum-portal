import { useCallback, useState } from 'react';
import { useAccount, useConfig } from 'wagmi';

import { Tooltip } from '@/app/components/common/Tooltip';
import { resumeLifiRoute } from '@/token-bridge-sdk/LifiRouteExecutor';

import { GET_HELP_LINK } from '../../constants';
import { useClaimWithdrawal } from '../../hooks/useClaimWithdrawal';
import { useLifiMergedTransactionCacheStore } from '../../hooks/useLifiMergedTransactionCacheStore';
import { useRedeemRetryable } from '../../hooks/useRedeemRetryable';
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig';
import { MergedTransaction } from '../../state/app/state';
import { isDepositReadyToRedeem } from '../../state/app/utils';
import { useClaimCctp } from '../../state/cctpState';
import { addressesEqual } from '../../util/AddressUtils';
import { trackEvent } from '../../util/AnalyticsUtils';
import { formatAmount } from '../../util/NumberUtils';
import { sanitizeTokenSymbol } from '../../util/TokenUtils';
import { isUserRejectedError } from '../../util/isUserRejectedError';
import { getNetworkName } from '../../util/networks';
import { useWalletModal } from '../../wallet/hooks/useWalletModal';
import { Button } from '../common/Button';
import { DialogData, DialogType, DialogWrapper, useDialog2 } from '../common/Dialog2';
import { TransferCountdown } from '../common/TransferCountdown';
import { errorToast } from '../common/atoms/Toast';
import { useTransactionHistoryAddressStore } from './TransactionHistorySearchBar';
import {
  getTransactionType,
  isLifiTransfer,
  isLifiTransferResumable,
  isTxPending,
} from './helpers';

const actionRowPrimaryButtonClassName = 'w-14 rounded bg-lime-dark p-2 text-xs text-white';

function ActionRowConnectButton() {
  const { openConnectModal } = useWalletModal();

  return (
    <Button
      variant="primary"
      className={actionRowPrimaryButtonClassName}
      onClick={openConnectModal}
    >
      Connect
    </Button>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function TransactionsTableRowAction({
  tx,
  isError,
  type,
}: {
  tx: MergedTransaction;
  isError: boolean;
  type: 'deposits' | 'withdrawals';
}) {
  const { address: connectedAddress, chain, isConnected } = useAccount();
  const wagmiConfig = useConfig();
  const { switchChainAsync } = useSwitchNetworkWithConfig();
  const updateLifiTransactionInCache = useLifiMergedTransactionCacheStore(
    (state) => state.updateTransaction,
  );
  const [isResumingLifiRoute, setIsResumingLifiRoute] = useState(false);
  const [dialogProps, openDialog] = useDialog2();
  const networkName = getNetworkName(chain?.id ?? 0);
  const searchedAddress = useTransactionHistoryAddressStore((state) => state.sanitizedAddress);

  const isViewingAnotherAddress =
    connectedAddress && searchedAddress && !addressesEqual(connectedAddress, searchedAddress);

  const tokenSymbol = sanitizeTokenSymbol(tx.asset, {
    erc20L1Address: tx.tokenAddress,
    chainId: tx.sourceChainId,
  });

  const { claim, isClaiming } = useClaimWithdrawal(tx);
  const { claim: claimCctp, isClaiming: isClaimingCctp } = useClaimCctp(tx);
  const { redeem, isRedeeming } = useRedeemRetryable(tx, searchedAddress);

  const confirmDialog = useCallback(
    async (dialogType: DialogType, dialogData?: DialogData) => {
      const waitForInput = openDialog(dialogType, dialogData);
      const [confirmed] = await waitForInput();
      return confirmed;
    },
    [openDialog],
  );

  const isConnectedToCorrectNetworkForAction = isDepositReadyToRedeem(tx)
    ? chain?.id === tx.childChainId // for redemption actions, we connect to the child chain
    : chain?.id === tx.destinationChainId; // for claims, we need to be on the destination chain

  const handleRedeemRetryable = useCallback(async () => {
    try {
      if (!isConnectedToCorrectNetworkForAction) {
        await switchChainAsync({ chainId: tx.childChainId });
      }

      await redeem();
    } catch (error: unknown) {
      if (isUserRejectedError(error)) {
        return;
      }
      errorToast(`Can't retry the deposit: ${getErrorMessage(error)}`);
    }
  }, [tx, isConnectedToCorrectNetworkForAction, redeem, switchChainAsync]);

  const handleClaim = useCallback(async () => {
    try {
      if (!isConnectedToCorrectNetworkForAction) {
        await switchChainAsync({ chainId: tx.destinationChainId });
      }

      if (tx.isCctp) {
        return await claimCctp();
      } else {
        return await claim();
      }
    } catch (error: unknown) {
      if (isUserRejectedError(error)) {
        return;
      }

      errorToast(
        `Can't claim ${type === 'deposits' ? 'deposit' : 'withdrawal'}: ${getErrorMessage(error)}`,
      );
    }
  }, [claim, claimCctp, isConnectedToCorrectNetworkForAction, switchChainAsync, tx, type]);

  const handleResumeLifiRoute = useCallback(async () => {
    if (!isLifiTransfer(tx) || !tx.lifiRoute) {
      return;
    }

    try {
      setIsResumingLifiRoute(true);
      await resumeLifiRoute(tx.lifiRoute, {
        wagmiConfig,
        switchChainAsync,
        onApprovalRequest: (approvalRequest) =>
          confirmDialog('approve_lifi_token', { lifiApproval: { approvalRequest } }),
        onRouteUpdate: (lifiRoute) => updateLifiTransactionInCache(tx, { lifiRoute }),
      });
    } catch (error: unknown) {
      if (isUserRejectedError(error)) {
        return;
      }

      errorToast(`Can't resume LiFi transaction: ${getErrorMessage(error)}`);
    } finally {
      setIsResumingLifiRoute(false);
    }
  }, [confirmDialog, switchChainAsync, tx, updateLifiTransactionInCache, wagmiConfig]);

  const getHelpOnError = () => {
    window.open(GET_HELP_LINK, '_blank');

    // track the button click
    trackEvent('Tx Error: Get Help Click', {
      network: networkName,
      transactionType: getTransactionType(tx),
    });
  };

  if (isDepositReadyToRedeem(tx)) {
    if (!isConnected) {
      return <ActionRowConnectButton />;
    }

    // Failed retryable
    return isRedeeming ? (
      <span className="animate-pulse">Retrying...</span>
    ) : (
      <Button
        aria-label="Retry transaction"
        variant="primary"
        onClick={handleRedeemRetryable}
        className="w-14 bg-red-400 p-2 text-xs text-black"
      >
        Retry
      </Button>
    );
  }

  if (isLifiTransferResumable(tx)) {
    if (!isConnected) {
      return <ActionRowConnectButton />;
    }

    if (!connectedAddress || !tx.sender || !addressesEqual(connectedAddress, tx.sender)) {
      return null;
    }

    return (
      <>
        {isResumingLifiRoute ? (
          <span className="animate-pulse">Resuming...</span>
        ) : (
          <Button
            aria-label="Resume LiFi transaction"
            variant="primary"
            onClick={handleResumeLifiRoute}
            className={actionRowPrimaryButtonClassName}
          >
            Resume
          </Button>
        )}
        <DialogWrapper {...dialogProps} />
      </>
    );
  }

  if (isTxPending(tx)) {
    return (
      <div className="flex flex-col text-center text-xs">
        <span>Time left:</span>
        <TransferCountdown tx={tx} />
      </div>
    );
  }

  if (tx.status === 'Confirmed') {
    if (tx.isCctp && tx.resolvedAt) {
      return null;
    }

    if (!isConnected) {
      return <ActionRowConnectButton />;
    }

    if (isLifiTransfer(tx)) {
      return null;
    }

    return isClaiming || isClaimingCctp ? (
      <span className="my-2 animate-pulse text-xs">Claiming...</span>
    ) : (
      <Tooltip
        content={
          <span>{`Funds will arrive at ${searchedAddress} on ${getNetworkName(
            tx.destinationChainId,
          )} once the claim transaction succeeds.`}</span>
        }
        show={isViewingAnotherAddress}
      >
        <Button
          aria-label={`Claim ${formatAmount(Number(tx.value), {
            symbol: tokenSymbol,
          })}`}
          variant="primary"
          className="w-14 rounded bg-green-400 p-2 text-xs text-black"
          onClick={handleClaim}
        >
          Claim
        </Button>
      </Tooltip>
    );
  }

  if (isError) {
    return (
      <Button variant="secondary" className="w-14 border-white/30 text-xs" onClick={getHelpOnError}>
        Get help
      </Button>
    );
  }

  return null;
}
