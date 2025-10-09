import { minutesToHumanReadableTime, useTransferDuration } from '../../hooks/useTransferDuration';
import { DepositStatus, MergedTransaction } from '../../state/app/state';

/**
 * Displays a transfer countdown for a deposit, withdrawal, or cctp.
 *
 * @param {MergedTransaction} tx - The transaction object.
 * @param {string} textAfterTime - Text to be displayed after the remaining time, e.g. if this was "remaining", it would result with e.g. "15 minutes remaining".
 */
export function TransferCountdown({
  tx,
  textAfterTime = '',
}: {
  tx: MergedTransaction;
  textAfterTime?: string;
}) {
  const { estimatedMinutesLeft } = useTransferDuration(tx);

  if (estimatedMinutesLeft === null) {
    return <span>Calculating...</span>;
  }

  const isStandardDeposit = !tx.isWithdrawal && !tx.isCctp && !tx.isOft;

  if (isStandardDeposit) {
    const depositStatus = tx.depositStatus;

    // Only show when status is Pending
    if (
      !depositStatus ||
      ![DepositStatus.L1_PENDING, DepositStatus.L2_PENDING].includes(depositStatus)
    ) {
      return null;
    }
  }

  return (
    <span className="whitespace-nowrap">
      {minutesToHumanReadableTime(estimatedMinutesLeft)} {textAfterTime}
    </span>
  );
}
