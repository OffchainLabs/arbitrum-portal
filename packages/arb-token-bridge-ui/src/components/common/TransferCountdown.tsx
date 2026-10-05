import { minutesToHumanReadableTime, useTransferDuration } from '../../hooks/useTransferDuration';
import { DepositStatus, MergedTransaction } from '../../state/app/state';

export const TAKING_LONGER_THAN_USUAL_BUFFER_MINUTES = 10;

/**
 * Displays a transfer countdown for a deposit, withdrawal, or cctp.
 *
 * @param {MergedTransaction} tx - The transaction object.
 * @param {string} label - Text shown above the remaining time, e.g. "Time left:". Hidden once the transfer is taking longer than usual.
 * @param {string} textAfterTime - Text to be displayed after the remaining time, e.g. if this was "remaining", it would result with e.g. "15 minutes remaining".
 * @param {number} bufferMinutes - How long past the estimate to keep showing "Less than a minute" before switching to "Taking longer than usual".
 */
export function TransferCountdown({
  tx,
  label,
  textAfterTime = '',
  bufferMinutes = TAKING_LONGER_THAN_USUAL_BUFFER_MINUTES,
}: {
  tx: MergedTransaction;
  label?: string;
  textAfterTime?: string;
  bufferMinutes?: number;
}) {
  const { estimatedMinutesLeft, minutesPastEstimate } = useTransferDuration(tx);
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

  const isTakingLongerThanUsual =
    estimatedMinutesLeft === 0 &&
    minutesPastEstimate !== null &&
    minutesPastEstimate >= bufferMinutes;

  if (isTakingLongerThanUsual) {
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
