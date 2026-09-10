import dayjs, { Dayjs } from 'dayjs';

import { isLifiTransfer } from '../components/TransactionHistory/helpers';
import { MergedTransaction } from '../state/app/state';
import { useRemainingTimeCctp } from '../state/cctpState';
import { getBoldInfo, getDifferenceInSeconds } from '../util/BoLDUtils';
import { getLifiTransactionSnapshot } from '../util/LifiRouteUtils';
import { getConfirmationTime } from '../util/WithdrawalUtils';
import { isNetwork } from '../util/networks';

const DEPOSIT_TIME_MINUTES = {
  mainnet: 15,
  testnet: 10,
};

const TRANSFER_TIME_MINUTES_CCTP = {
  mainnet: 15,
  testnet: 1,
};

/**
 * Applies to deposits whose parent is not an L1, i.e. Orbit chains settling to an Arbitrum chain or to Base.
 * Orbit chains that settle directly to an L1 (e.g. Robinhood Chain) use DEPOSIT_TIME_MINUTES,
 * see `getDepositDuration`.
 *
 * TODO: Allow custom deposit times in orbit config (e.g. Xai should be 1 min)
 * For now set 5 minutes for mainnet, 1 minute for testnet
 */
const DEPOSIT_TIME_MINUTES_ORBIT = {
  mainnet: 5,
  testnet: 1,
};

type UseTransferDurationResult = {
  approximateDurationInMinutes: number;
  estimatedMinutesLeft: number | null;
};

/**
 * Calculates the transfer duration in minutes for a given transaction.
 *
 * @param {MergedTransaction} tx - The transaction object.
 * @returns {UseTransferDurationResult} - An object containing the total duration, first leg duration, and remaining time.
 * @property {number} approximateDurationInMinutes - The total duration of the transfer in minutes.
 * @property {number | null} estimatedMinutesLeft - The remaining time for the transfer in minutes, or null if calculating or unavailable.
 */
export const useTransferDuration = (tx: MergedTransaction): UseTransferDurationResult => {
  const { estimatedMinutesLeftCctp } = useRemainingTimeCctp(tx);

  const { isCctp, childChainId, parentChainId, isOft } = tx;
  const { isTestnet } = isNetwork(childChainId);

  if (isLifiTransfer(tx)) {
    const durationMs = getLifiTransactionSnapshot(tx)?.durationMs;
    const durationMinutes =
      (typeof durationMs === 'number' && Number.isFinite(durationMs) ? durationMs : 15_000) /
      (60 * 1_000);

    return {
      approximateDurationInMinutes: durationMinutes,
      estimatedMinutesLeft: getRemainingMinutes({
        createdAt: tx.createdAt,
        totalDuration: durationMinutes,
      }),
    };
  }

  if (isCctp) {
    const cctpTransferDuration = getCctpTransferDuration(isTestnet);
    return {
      approximateDurationInMinutes: cctpTransferDuration,
      estimatedMinutesLeft: estimatedMinutesLeftCctp,
    };
  }

  if (isOft) {
    const OFT_TRANSFER_DURATION_MINUTES = 5;
    return {
      approximateDurationInMinutes: OFT_TRANSFER_DURATION_MINUTES,
      estimatedMinutesLeft: getRemainingMinutes({
        createdAt: tx.createdAt,
        totalDuration: OFT_TRANSFER_DURATION_MINUTES,
      }),
    };
  }

  if (tx.isWithdrawal) {
    const withdrawalDuration = getWithdrawalDuration(tx);
    return {
      approximateDurationInMinutes: withdrawalDuration,
      estimatedMinutesLeft: getRemainingMinutes({
        createdAt: tx.createdAt,
        totalDuration: withdrawalDuration,
      }),
    };
  }

  const depositDuration = getDepositDuration({ parentChainId, isTestnet });

  return {
    approximateDurationInMinutes: depositDuration,
    estimatedMinutesLeft: getRemainingMinutes({
      createdAt: tx.createdAt,
      totalDuration: depositDuration,
    }),
  };
};

export function getWithdrawalConfirmationDate({
  createdAt,
  withdrawalFromChainId,
}: {
  createdAt: number | null;
  withdrawalFromChainId: number;
}): Dayjs {
  const { confirmationTimeInSeconds } = getConfirmationTime(withdrawalFromChainId);

  // For new txs createdAt won't be defined yet, we default to the current time in that case
  if (createdAt === null) {
    return dayjs().add(confirmationTimeInSeconds, 'second');
  }

  const boldInfo = getBoldInfo({ createdAt, withdrawalFromChainId });

  if (boldInfo.affected) {
    // Messages not confirmed at the time of the BoLD upgrade had their confirmation time reset and start again
    const confirmationTimeBeforeResetInSeconds = getDifferenceInSeconds(
      new Date(createdAt),
      boldInfo.upgradeTime,
    );

    return dayjs(createdAt)
      .add(confirmationTimeBeforeResetInSeconds, 'second')
      .add(confirmationTimeInSeconds, 'second');
  }

  // Add the confirmation time to createdAt
  return dayjs(createdAt).add(confirmationTimeInSeconds, 'second');
}

export function getWithdrawalDuration({
  createdAt,
  sourceChainId,
}: Pick<MergedTransaction, 'createdAt' | 'sourceChainId'>) {
  const confirmationDate = getWithdrawalConfirmationDate({
    createdAt: createdAt,
    withdrawalFromChainId: sourceChainId,
  });
  return Math.max(confirmationDate.diff(createdAt, 'minute'), 0);
}

export function getStandardDepositDuration(testnet: boolean) {
  return testnet ? DEPOSIT_TIME_MINUTES.testnet : DEPOSIT_TIME_MINUTES.mainnet;
}

export function getOrbitDepositDuration(testnet: boolean) {
  return testnet ? DEPOSIT_TIME_MINUTES_ORBIT.testnet : DEPOSIT_TIME_MINUTES_ORBIT.mainnet;
}

/**
 * Deposits whose parent chain is an L1 (Ethereum / Sepolia / Local) wait for L1 finality,
 * regardless of whether the child is a core Arbitrum chain or an Orbit chain.
 * Deposits from any other parent (an Arbitrum chain or Base) use the shorter Orbit estimate.
 */
export function getDepositDuration({
  parentChainId,
  isTestnet,
}: {
  parentChainId: number;
  isTestnet: boolean;
}) {
  const { isEthereumMainnetOrTestnet } = isNetwork(parentChainId);
  return isEthereumMainnetOrTestnet
    ? getStandardDepositDuration(isTestnet)
    : getOrbitDepositDuration(isTestnet);
}

export function getCctpTransferDuration(testnet: boolean) {
  return testnet ? TRANSFER_TIME_MINUTES_CCTP.testnet : TRANSFER_TIME_MINUTES_CCTP.mainnet;
}

function getRemainingMinutes({
  createdAt,
  totalDuration,
}: {
  createdAt: number | null;
  totalDuration: number;
}): number {
  // For new txs createdAt won't be defined yet, we default to the current time in that case
  const createdAtDate = createdAt ? dayjs(createdAt) : dayjs();
  const estimatedCompletionTime = createdAtDate.add(totalDuration, 'minutes');

  return Math.max(estimatedCompletionTime.diff(dayjs(), 'minute'), 0);
}

export function minutesToHumanReadableTime(minutes: number | null) {
  if (minutes === null) {
    return 'Calculating...';
  }
  if (minutes <= 0) {
    return 'Less than a minute';
  }
  // will convert number to '20 minutes', '1 hour', '7 days', etc
  return dayjs().add(minutes, 'minutes').fromNow(true);
}
