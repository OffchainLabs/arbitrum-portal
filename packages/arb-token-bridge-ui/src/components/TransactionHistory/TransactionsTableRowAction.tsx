import { useCallback } from 'react';
import { isAddress } from 'viem';

import { Tooltip } from '@/app/components/common/Tooltip';

import { GET_HELP_LINK } from '../../constants';
import { useClaimWithdrawal } from '../../hooks/useClaimWithdrawal';
import { useRedeemRetryable } from '../../hooks/useRedeemRetryable';
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig';
import { DepositStatus, MergedTransaction } from '../../state/app/state';
import { isDepositReadyToRedeem } from '../../state/app/utils';
import { useClaimCctp } from '../../state/cctpState';
import { addressesEqual } from '../../util/AddressUtils';
import { trackEvent } from '../../util/AnalyticsUtils';
import { formatAmount } from '../../util/NumberUtils';
import { sanitizeTokenSymbol } from '../../util/TokenUtils';
import { formatTransactionError, isUserRejectedError } from '../../util/isUserRejectedError';
import { getNetworkName } from '../../util/networks';
import { useWalletContext } from '../../wallet/WalletContext';
import { useWalletModal } from '../../wallet/hooks/useWalletModal';
import { Button } from '../common/Button';
import { TransferCountdown } from '../common/TransferCountdown';
import { errorToast } from '../common/atoms/Toast';
import { useTransactionHistoryAddressStore } from './TransactionHistorySearchBar';
import { getTransactionType, isLifiTransfer, isOftTransfer, isTxPending } from './helpers';

function ActionRowConnectButton() {
  const { openConnectModal } = useWalletModal();

  return (
    <Button
      variant="primary"
      className="w-14 rounded bg-lime-dark p-2 text-xs text-white"
      onClick={openConnectModal}
    >
      Connect
    </Button>
  );
}

type RowActionProps = {
  tx: MergedTransaction;
  isError: boolean;
  type: 'deposits' | 'withdrawals';
};

export function TransactionsTableRowAction(props: RowActionProps) {
  const { tx, isError } = props;
  if (!isLifiTransfer(tx) && !isOftTransfer(tx)) {
    return <CanonicalTransactionRowAction {...props} />;
  }
  if (isTxPending(tx)) {
    return (
      <div className="flex flex-col text-center text-xs">
        <span>Time left:</span>
        <TransferCountdown tx={tx} />
      </div>
    );
  }
  if (!isError) return null;
  return (
    <Button
      variant="secondary"
      className="w-14 border-white/30 text-xs"
      onClick={() => {
        window.open(GET_HELP_LINK, '_blank');
        trackEvent('Tx Error: Get Help Click', {
          network: getNetworkName(tx.sourceChainId),
          transactionType: getTransactionType(tx),
        });
      }}
    >
      Get help
    </Button>
  );
}

function CanonicalTransactionRowAction({ tx, isError, type }: RowActionProps) {
  const evmWallet = useWalletContext('evm');
  const chainId = evmWallet.account.chainId;
  const connectedAddress = evmWallet.account.address;
  const isConnected = evmWallet.isConnected;
  const { switchChainAsync } = useSwitchNetworkWithConfig();
  const networkName = getNetworkName(chainId ?? 0);
  const searchedAddress = useTransactionHistoryAddressStore((state) => state.sanitizedAddress);
  const evmSearchedAddress =
    searchedAddress && isAddress(searchedAddress) ? searchedAddress : undefined;

  const isViewingAnotherAddress = Boolean(
    connectedAddress && searchedAddress && !addressesEqual(connectedAddress, searchedAddress),
  );

  const tokenSymbol = sanitizeTokenSymbol(tx.asset, {
    erc20L1Address: tx.tokenAddress,
    chainId: tx.sourceChainId,
  });

  const { claim, isClaiming } = useClaimWithdrawal(tx);
  const { claim: claimCctp, isClaiming: isClaimingCctp } = useClaimCctp(tx);
  const { redeem, isRedeeming } = useRedeemRetryable(tx, evmSearchedAddress);

  const isConnectedToCorrectNetworkForAction = isDepositReadyToRedeem(tx)
    ? chainId === tx.childChainId // for redemption actions, we connect to the child chain
    : chainId === tx.destinationChainId; // for claims, we need to be on the destination chain

  const handleRedeemRetryable = useCallback(async () => {
    try {
      if (!isConnectedToCorrectNetworkForAction) {
        await switchChainAsync({ chainId: tx.childChainId });
      }

      await redeem();
    } catch (error: any) {
      if (isUserRejectedError(error)) {
        return;
      }
      errorToast(`Can't retry the deposit: ${formatTransactionError(error)}`);
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
    } catch (error: any) {
      if (isUserRejectedError(error)) {
        return;
      }

      errorToast(
        `Can't claim ${type === 'deposits' ? 'deposit' : 'withdrawal'}: ${formatTransactionError(error)}`,
      );
    }
  }, [claim, claimCctp, isConnectedToCorrectNetworkForAction, switchChainAsync, tx, type]);

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

  if (
    tx.status === 'pending' ||
    tx.status === 'Unconfirmed' ||
    tx.depositStatus === DepositStatus.L1_PENDING ||
    tx.depositStatus === DepositStatus.L2_PENDING
  ) {
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
