import { Tooltip } from '@/app/components/common/Tooltip';

import { GET_HELP_LINK } from '../../constants';
import { useCanonicalHistoryActions } from '../../hooks/useCanonicalHistoryActions';
import {
  getTransactionType,
  isLifiTransfer,
  isOftTransfer,
  isTxPending,
} from '../../services/history';
import { DepositStatus, MergedTransaction } from '../../state/app/state';
import { isDepositReadyToRedeem } from '../../state/app/utils';
import { trackEvent } from '../../util/AnalyticsUtils';
import { formatAmount } from '../../util/NumberUtils';
import { getNetworkName } from '../../util/networks';
import { useWalletModal } from '../../wallet/hooks/useWalletModal';
import { Button } from '../common/Button';
import { TransferCountdown } from '../common/TransferCountdown';

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
