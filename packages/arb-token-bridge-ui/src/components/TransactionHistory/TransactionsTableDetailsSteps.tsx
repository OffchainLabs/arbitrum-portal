import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import type { ProcessType } from '@lifi/sdk';
import { ReactNode, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

import { AssetType } from '../../hooks/arbTokenBridge.types';
import { minutesToHumanReadableTime, useTransferDuration } from '../../hooks/useTransferDuration';
import {
  DepositStatus,
  LifiRouteHistoryStep,
  MergedTransaction,
  WithdrawalStatus,
} from '../../state/app/state';
import { isDepositReadyToRedeem } from '../../state/app/utils';
import { addressesEqual } from '../../util/AddressUtils';
import { getLifiRouteHistorySteps } from '../../util/LifiRouteUtils';
import {
  LIFI_TRANSFER_PROCESS_TYPES,
  isPendingLifiProcessId,
  isValidLifiTransactionHash,
} from '../../util/LifiTransactionStatus';
import { getNetworkName } from '../../util/networks';
import { ExternalLink } from '../common/ExternalLink';
import { TransferCountdown } from '../common/TransferCountdown';
import { TransactionsTableRowAction } from './TransactionsTableRowAction';
import {
  getDestinationNetworkTxId,
  getDestinationTransactionUrl,
  getSourceTransactionUrl,
  isLifiTransfer,
  isTxClaimable,
  isTxCompleted,
  isTxExpired,
  isTxFailed,
  isTxPending,
} from './helpers';

const LIFI_APPROVAL_PROCESS_TYPES: ReadonlySet<ProcessType> = new Set([
  'TOKEN_ALLOWANCE',
  'PERMIT',
]);
function needsToClaimTransfer(tx: MergedTransaction) {
  if (tx.isOft || isLifiTransfer(tx)) {
    return false;
  }

  return tx.isCctp || tx.isWithdrawal;
}

export const Step = ({
  done = false,
  claimable = false,
  pending = false,
  failure = false,
  text,
  endItem = null,
  extendHeight = false,
}: {
  done?: boolean;
  claimable?: boolean;
  pending?: boolean;
  failure?: boolean;
  text: React.ReactNode;
  endItem?: ReactNode;
  extendHeight?: boolean;
}) => {
  // defaults to a step that hasn't been started yet
  let borderColorClassName = 'border-white/50';
  let iconClassName = 'text-white/50 shrink-0';
  let textColorClassName = 'text-white/50';

  if (done || claimable) {
    borderColorClassName = 'border-green-400';
    iconClassName = 'text-green-400 shrink-0';
    textColorClassName = 'text-white';
  }

  if (pending) {
    borderColorClassName = 'border-yellow-400';
    iconClassName = 'text-yellow-400 shrink-0';
    textColorClassName = 'text-white';
  }

  if (failure) {
    borderColorClassName = 'border-red-400';
    iconClassName = 'text-red-400 shrink-0';
    textColorClassName = 'text-white';
  }

  return (
    <div
      className={twMerge(
        'my-3 flex h-3 items-center justify-between space-x-2',
        pending && 'animate-pulse',
        extendHeight && 'h-auto items-start',
      )}
    >
      <div className={twMerge('flex items-center space-x-3', extendHeight && 'items-start')}>
        {failure ? (
          <XCircleIcon className={iconClassName} height={18} />
        ) : done ? (
          <CheckCircleIcon className={iconClassName} height={18} />
        ) : (
          <div
            className={twMerge(
              'ml-[2px] h-[15px] w-[15px] shrink-0 rounded-full border',
              borderColorClassName,
            )}
          />
        )}
        <span className={textColorClassName}>{text}</span>
      </div>
      {endItem}
    </div>
  );
};

const LastStepEndItem = ({ tx }: { tx: MergedTransaction }) => {
  const destinationNetworkTxId = getDestinationNetworkTxId(tx);

  if (destinationNetworkTxId) {
    return (
      <ExternalLink href={getDestinationTransactionUrl(tx)}>
        <ArrowTopRightOnSquareIcon height={12} />
      </ExternalLink>
    );
  }

  if (isDepositReadyToRedeem(tx)) {
    return <TransactionsTableRowAction type="deposits" tx={tx} />;
  }

  return null;
};

export const TransactionFailedOnNetwork = ({
  networkName,
  tx,
}: {
  networkName: string;
  tx: Pick<MergedTransaction, 'assetType' | 'sender' | 'destination'>;
}) => {
  const willSettleOnExpiry =
    tx.assetType === AssetType.ETH &&
    !!tx.sender &&
    !!tx.destination &&
    addressesEqual(tx.sender, tx.destination);

  return (
    <div>
      Transaction failed on {networkName}.{' '}
      {willSettleOnExpiry ? (
        <>
          You can retry now or wait for your funds to settle successfully on {networkName} 7 days
          after your initial transaction.
        </>
      ) : (
        <>
          You have 7 days to try again. After that, your funds will be{' '}
          <span className="font-bold text-red-400">lost forever</span>.
        </>
      )}
    </div>
  );
};

function isSourceChainStatusFailure(tx: MergedTransaction) {
  if (isLifiTransfer(tx)) {
    return tx.status === WithdrawalStatus.FAILURE;
  }

  return (
    typeof tx.depositStatus !== 'undefined' &&
    [DepositStatus.CREATION_FAILED, DepositStatus.L1_FAILURE].includes(tx.depositStatus)
  );
}

function isDestinationChainStatusFailure(tx: MergedTransaction) {
  if (isLifiTransfer(tx)) {
    return (
      tx.destinationStatus === WithdrawalStatus.FAILURE ||
      tx.destinationStatus === WithdrawalStatus.REFUNDED
    );
  }

  return !isSourceChainStatusFailure(tx) && isTxFailed(tx);
}

function FirstStep({ tx }: { tx: MergedTransaction }) {
  const isSourceChainDepositFailure = isSourceChainStatusFailure(tx);
  const sourceNetworkName = getNetworkName(tx.sourceChainId);

  return (
    <Step
      done={!isSourceChainDepositFailure}
      failure={isSourceChainDepositFailure}
      text={
        isSourceChainDepositFailure
          ? `Transaction failed on ${sourceNetworkName}`
          : `Transaction initiated on ${sourceNetworkName}`
      }
      endItem={
        <ExternalLink href={getSourceTransactionUrl(tx)}>
          <ArrowTopRightOnSquareIcon height={12} />
        </ExternalLink>
      }
    />
  );
}

function getLifiStepProcessState(
  step: LifiRouteHistoryStep,
  processTypes: ReadonlySet<ProcessType>,
  { fallbackToAllProcesses = false }: { fallbackToAllProcesses?: boolean } = {},
) {
  const execution = step.execution;

  if (!execution) {
    return 'idle';
  }

  const allProcesses = execution.process.filter((process) => process.type !== 'SWITCH_CHAIN');
  const matchingProcesses = allProcesses.filter((process) => processTypes.has(process.type));
  const hasPreparedAllowance = matchingProcesses.some(
    (process) => process.type === 'TOKEN_ALLOWANCE' && process.status === 'DONE' && !process.txHash,
  );
  if (hasPreparedAllowance && execution.status !== 'DONE') {
    const transfers = allProcesses.filter((process) =>
      LIFI_TRANSFER_PROCESS_TYPES.has(process.type),
    );
    if (
      transfers.some(
        (process) =>
          process.status === 'DONE' ||
          (!isPendingLifiProcessId(process) && isValidLifiTransactionHash(process.txHash)),
      )
    ) {
      return 'done';
    }
    if (execution.status === 'FAILED' || transfers.some((process) => process.status === 'FAILED')) {
      return 'failure';
    }
    return 'pending';
  }
  const processes =
    matchingProcesses.length > 0 || !fallbackToAllProcesses ? matchingProcesses : allProcesses;

  if (processes.some((process) => process.status === 'FAILED')) {
    return 'failure';
  }

  if (processes.some((process) => process.status === 'DONE')) {
    return 'done';
  }

  const pending = processes.some((process) =>
    ['STARTED', 'ACTION_REQUIRED', 'PENDING'].includes(process.status),
  );

  return pending ? 'pending' : 'idle';
}

function LifiDetailsSteps({ tx, steps }: { tx: MergedTransaction; steps: LifiRouteHistoryStep[] }) {
  const displaySteps = steps.flatMap((step) => {
    const chainName = getNetworkName(step.fromChainId);
    return [
      ...(step.requiresApproval === false
        ? []
        : [
            {
              id: `${step.id}-approval`,
              text: `Approve transaction on ${chainName}`,
              state: getLifiStepProcessState(step, LIFI_APPROVAL_PROCESS_TYPES, {
                fallbackToAllProcesses: true,
              }),
            },
          ]),
      {
        id: `${step.id}-transfer`,
        text: `Approve transfer on ${chainName}`,
        state: getLifiStepProcessState(step, LIFI_TRANSFER_PROCESS_TYPES),
      },
    ];
  });
  displaySteps.push({
    id: 'arrival',
    text: `Funds arrive on ${getNetworkName(tx.destinationChainId)}`,
    state:
      isTxExpired(tx) || isDestinationChainStatusFailure(tx)
        ? 'failure'
        : isTxCompleted(tx)
          ? 'done'
          : isTxPending(tx)
            ? 'pending'
            : 'idle',
  });
  const firstUnfinishedStep = displaySteps.findIndex(
    ({ state }) => state !== 'done' && state !== 'failure',
  );

  return (
    <div className="flex flex-col text-xs">
      <FirstStep tx={tx} />

      {displaySteps.map((step, index) => {
        const state =
          firstUnfinishedStep !== -1 && index > firstUnfinishedStep ? 'idle' : step.state;
        return (
          <Step
            key={step.id}
            done={state === 'done'}
            pending={state === 'pending'}
            failure={state === 'failure'}
            text={step.text}
            endItem={step.id === 'arrival' ? <LastStepEndItem tx={tx} /> : null}
          />
        );
      })}
    </div>
  );
}

export const TransactionsTableDetailsSteps = ({ tx }: { tx: MergedTransaction }) => {
  const { approximateDurationInMinutes } = useTransferDuration(tx);

  const { sourceChainId } = tx;

  const sourceNetworkName = getNetworkName(sourceChainId);

  const isSourceChainDepositFailure = isSourceChainStatusFailure(tx);

  const isDestinationChainFailure = isDestinationChainStatusFailure(tx);
  const isLifiRefunded = isLifiTransfer(tx) && tx.destinationStatus === WithdrawalStatus.REFUNDED;

  const destinationChainTxText = useMemo(() => {
    const networkName = getNetworkName(tx.destinationChainId);
    const fundsArrivedText = `Funds arrived on ${networkName}`;

    if (isTxExpired(tx)) {
      return `Transaction expired on ${networkName}`;
    }

    if (isDepositReadyToRedeem(tx)) {
      return <TransactionFailedOnNetwork networkName={networkName} tx={tx} />;
    }
    if (isDestinationChainFailure) {
      if (isLifiRefunded) {
        return `Funds refunded on ${sourceNetworkName}`;
      }
      return `Transaction failed on ${networkName}.`;
    }
    return fundsArrivedText;
  }, [tx, isDestinationChainFailure, sourceNetworkName, isLifiRefunded]);

  const routeSteps = isLifiTransfer(tx) ? getLifiRouteHistorySteps(tx.lifiRoute) : [];
  const detailedLifiRouteSteps = isLifiTransfer(tx)
    ? (tx.lifiRouteSteps?.map((step) => ({
        ...step,
        requiresApproval:
          step.requiresApproval ?? routeSteps.find(({ id }) => id === step.id)?.requiresApproval,
      })) ?? routeSteps)
    : [];
  if (detailedLifiRouteSteps.length > 0) {
    return <LifiDetailsSteps tx={tx} steps={detailedLifiRouteSteps} />;
  }

  return (
    <div className="flex flex-col text-xs">
      {/* First step when transfer is initiated */}
      <FirstStep tx={tx} />

      {/* Pending transfer showing the remaining time */}
      <Step
        pending={isTxPending(tx)}
        done={!isTxPending(tx) && !isSourceChainDepositFailure}
        text={`Wait ~${minutesToHumanReadableTime(approximateDurationInMinutes)}`}
        endItem={isTxPending(tx) && <TransferCountdown tx={tx} textAfterTime="remaining" />}
      />

      {/* If claiming is required we show this step */}
      {needsToClaimTransfer(tx) && (
        <Step
          done={isTxCompleted(tx)}
          claimable={isTxClaimable(tx)}
          text={`Claim ${tx.isWithdrawal ? 'withdrawal' : 'deposit'}`}
          endItem={
            isTxClaimable(tx) && (
              <TransactionsTableRowAction
                type={tx.isWithdrawal ? 'withdrawals' : 'deposits'}
                tx={tx}
              />
            )
          }
        />
      )}

      {/* The final step, showing the destination chain */}
      <Step
        done={isTxCompleted(tx)}
        failure={isTxExpired(tx) || isDestinationChainFailure}
        text={destinationChainTxText}
        endItem={<LastStepEndItem tx={tx} />}
      />
    </div>
  );
};
