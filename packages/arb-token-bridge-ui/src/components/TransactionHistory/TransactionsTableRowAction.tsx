import { useCallback, useState } from 'react';

import { Tooltip } from '@/app/components/common/Tooltip';

import { GET_HELP_LINK } from '../../constants';
import { AssetType } from '../../hooks/arbTokenBridge.types';
import { useCanonicalHistoryActions } from '../../hooks/useCanonicalHistoryActions';
import { useLifiHistoryActions } from '../../hooks/useLifiHistoryActions';
import type { UseTransactionHistoryResult } from '../../hooks/useTransactionHistory';
import {
  getTransactionType,
  isLifiTransfer,
  isLifiTransferResumable,
  isOftTransfer,
  isTxPending,
} from '../../services/history';
import {
  DepositStatus,
  LifiMergedTransaction,
  MergedTransaction,
  WithdrawalStatus,
} from '../../state/app/state';
import { isDepositReadyToRedeem } from '../../state/app/utils';
import { trackEvent } from '../../util/AnalyticsUtils';
import { formatAmount } from '../../util/NumberUtils';
import { getNetworkName } from '../../util/networks';
import { useWalletModal } from '../../wallet/hooks/useWalletModal';
import { Button } from '../common/Button';
import { DialogWrapper, useDialog2 } from '../common/Dialog2';
import { TransferCountdown } from '../common/TransferCountdown';
import { errorToast } from '../common/atoms/Toast';

const actionRowPrimaryButtonClassName = 'w-14 rounded bg-lime-dark p-2 text-xs text-white';

type RowActionProps = {
  tx: MergedTransaction;
  type: 'deposits' | 'withdrawals';
  updateTransaction?: UseTransactionHistoryResult['updateTransaction'];
};

function isTransactionError(tx: MergedTransaction) {
  if (tx.isCctp || !tx.isWithdrawal) {
    if (
      tx.depositStatus === DepositStatus.L1_FAILURE ||
      tx.depositStatus === DepositStatus.EXPIRED
    ) {
      return true;
    }

    if (tx.depositStatus === DepositStatus.CREATION_FAILED) {
      return tx.assetType === AssetType.ETH;
    }
  }

  return tx.status === WithdrawalStatus.FAILURE;
}

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

function GetHelpButton({ networkId, tx }: { networkId: number; tx: MergedTransaction }) {
  return (
    <Button
      variant="secondary"
      className="w-14 border-white/30 text-xs"
      onClick={() => {
        window.open(GET_HELP_LINK, '_blank');
        trackEvent('Tx Error: Get Help Click', {
          network: getNetworkName(networkId),
          transactionType: getTransactionType(tx),
        });
      }}
    >
      Get help
    </Button>
  );
}

export function TransactionsTableRowAction(props: RowActionProps) {
  const { tx } = props;
  const isError = isTransactionError(tx);

  if (isLifiTransfer(tx)) {
    return <LifiTransactionRowAction {...props} tx={tx} isError={isError} />;
  }

  if (isOftTransfer(tx)) {
    if (isTxPending(tx)) {
      return (
        <div className="flex flex-col text-center text-xs">
          <span>Time left:</span>
          <TransferCountdown tx={tx} />
        </div>
      );
    }

    return isError ? <GetHelpButton networkId={tx.sourceChainId} tx={tx} /> : null;
  }

  return <CanonicalTransactionRowAction {...props} isError={isError} />;
}

function LifiTransactionRowAction({
  tx,
  type,
  updateTransaction,
  isError,
}: RowActionProps & { tx: LifiMergedTransaction; isError: boolean }) {
  const [isResuming, setIsResuming] = useState(false);

  if (isResuming || isLifiTransferResumable(tx)) {
    return (
      <LifiResumeControls
        tx={tx}
        type={type}
        updateTransaction={updateTransaction}
        isResuming={isResuming}
        setIsResuming={setIsResuming}
      />
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

  return isError ? <GetHelpButton networkId={tx.sourceChainId} tx={tx} /> : null;
}

function LifiResumeControls({
  tx,
  updateTransaction,
  isResuming,
  setIsResuming,
}: {
  tx: LifiMergedTransaction;
  type: RowActionProps['type'];
  updateTransaction: RowActionProps['updateTransaction'];
  isResuming: boolean;
  setIsResuming: (isResuming: boolean) => void;
}) {
  const { isConnected, isSender, resume } = useLifiHistoryActions(tx, updateTransaction);
  const [dialogProps, openDialog] = useDialog2();

  const handleResumeLifiRoute = useCallback(async () => {
    try {
      setIsResuming(true);
      await resume(async (approvalRequest) => {
        const waitForInput = openDialog('approve_lifi_token', {
          lifiApproval: { approvalRequest },
        });
        const [confirmed] = await waitForInput();
        return confirmed;
      });
    } catch {
      errorToast("Can't resume LiFi transaction.");
    } finally {
      setIsResuming(false);
    }
  }, [openDialog, resume, setIsResuming]);

  if (!isConnected) {
    return <ActionRowConnectButton />;
  }

  if (!isSender) {
    return null;
  }

  return (
    <>
      {isResuming ? (
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

function CanonicalTransactionRowAction({
  tx,
  isError,
  type,
}: RowActionProps & { isError: boolean }) {
  const {
    isConnected,
    isRedeeming,
    handleRedeemRetryable,
    isClaiming,
    isClaimingCctp,
    isViewingAnotherAddress,
    searchedAddress,
    tokenSymbol,
    handleClaim,
    getHelpOnError,
  } = useCanonicalHistoryActions(tx, type);

  if (isDepositReadyToRedeem(tx)) {
    if (!isConnected) {
      return <ActionRowConnectButton />;
    }

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

  if (isTxPending(tx)) {
    return (
      <div className="flex flex-col text-center text-xs">
        <span>Time left:</span>
        <TransferCountdown tx={tx} />
      </div>
    );
  }

  if (tx.status === WithdrawalStatus.CONFIRMED) {
    if (tx.isCctp && tx.resolvedAt) {
      return null;
    }

    if (!isConnected) {
      return <ActionRowConnectButton />;
    }

    return isClaiming || isClaimingCctp ? (
      <span className="my-2 animate-pulse text-xs">Claiming...</span>
    ) : (
      <Tooltip
        content={
          <span>
            {'Funds will arrive at ' +
              searchedAddress +
              ' on ' +
              getNetworkName(tx.destinationChainId) +
              ' once the claim transaction succeeds.'}
          </span>
        }
        show={isViewingAnotherAddress}
      >
        <Button
          aria-label={
            'Claim ' +
            formatAmount(Number(tx.value), {
              symbol: tokenSymbol,
            })
          }
          variant="primary"
          className="w-14 rounded bg-green-400 p-2 text-xs text-black"
          onClick={handleClaim}
        >
          Claim
        </Button>
      </Tooltip>
    );
  }

  return isError ? (
    <Button variant="secondary" className="w-14 border-white/30 text-xs" onClick={getHelpOnError}>
      Get help
    </Button>
  ) : null;
}
