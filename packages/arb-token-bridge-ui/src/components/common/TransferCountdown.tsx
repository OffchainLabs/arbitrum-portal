import { minutesToHumanReadableTime, useTransferDuration } from '../../hooks/useTransferDuration';
import { DepositStatus, MergedTransaction } from '../../state/app/state';

/**
 * Displays a transfer countdown for a deposit, withdrawal, or cctp.
 *
 * @param {MergedTransaction} tx - The transaction object.
 * @param {string} label - Text shown above the remaining time, e.g. "Time left:". Hidden once the transfer takes longer than estimated.
 * @param {string} textAfterTime - Text to be displayed after the remaining time, e.g. if this was "remaining", it would result with e.g. "15 minutes remaining".
 */
export function TransferCountdown({
  tx,
  label,
  textAfterTime = '',
}: {
  tx: MergedTransaction;
  label?: string;
  textAfterTime?: string;
}) {
  const { estimatedMinutesLeft } = useTransferDuration(tx);
  const labelElement = label && <span>{label}</span>;

  if (estimatedMinutesLeft === null) {
    return (
      <>
        {labelElement}
        <span>Calculating...</span>
      </>
    );
  }

  const isStandardDeposit = !tx.isWithdrawal && !tx.isCctp && !tx.isOft && !tx.isLifi;

  if (isStandardDeposit) {
    const depositStatus = tx.depositStatus;

    // Only show when status is Pending
    if (
      !depositStatus ||
      ![DepositStatus.L1_PENDING, DepositStatus.L2_PENDING].includes(depositStatus)
    ) {
      return labelElement || null;
    }
  }

  if (estimatedMinutesLeft === 0) {
    return <span className="whitespace-nowrap">Taking longer than usual</span>;
  }

  return (
    <>
      {labelElement}
      <span className="whitespace-nowrap">
        {minutesToHumanReadableTime(estimatedMinutesLeft)} {textAfterTime}
      </span>
    </>
  );
}
