import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import type { ProcessType } from '@lifi/sdk';
import { ReactNode, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

import { minutesToHumanReadableTime, useTransferDuration } from '../../hooks/useTransferDuration';
import { DepositStatus, MergedTransaction, WithdrawalStatus } from '../../state/app/state';
import { isDepositReadyToRedeem } from '../../state/app/utils';
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
  'SWITCH_CHAIN',
]);
const LIFI_TRANSFER_PROCESS_TYPES: ReadonlySet<ProcessType> = new Set([
  'CROSS_CHAIN',
  'SWAP',
  'TRANSACTION',
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
    return <TransactionsTableRowAction type="deposits" isError={true} tx={tx} />;
  }

  return null;
};

export const TransactionFailedOnNetwork = ({ networkName }: { networkName: string }) => (
  <div>
    Transaction failed on {networkName}. You have 7 days to try again. After that, your funds will
    be <span className="font-bold text-red-400">lost forever</span>.
  </div>
);

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

function getLifiStepProcessState(
  step: NonNullable<ReturnType<typeof getDetailedLifiRouteSteps>>[number],
  processTypes: ReadonlySet<ProcessType>,
  { fallbackToAllProcesses = false }: { fallbackToAllProcesses?: boolean } = {},
) {
  const execution = step.execution;

  if (!execution) {
    return 'idle';
  }

  const allProcesses = execution.process ?? [];
  const matchingProcesses = allProcesses.filter((process) => processTypes.has(process.type));
  const processes =
    matchingProcesses.length > 0 || !fallbackToAllProcesses ? matchingProcesses : allProcesses;

  if (processes.length === 0) {
    return 'idle';
  }

  const failure =
    execution.status === 'FAILED' || processes.some((process) => process.status === 'FAILED');

  if (failure) {
    return 'failure';
  }

  const done =
    execution.status === 'DONE' ||
    processes.some((process) => process.status === 'DONE' || typeof process.txHash === 'string');

  if (done) {
    return 'done';
  }

  const pending =
    execution.status === 'ACTION_REQUIRED' ||
    execution.status === 'PENDING' ||
    processes.some((process) => ['STARTED', 'ACTION_REQUIRED', 'PENDING'].includes(process.status));

  return pending ? 'pending' : 'idle';
}

function getDetailedLifiRouteSteps(tx: MergedTransaction) {
  if (!isLifiTransfer(tx)) {
    return undefined;
  }

  const steps = tx.lifiRoute?.steps;
  return steps?.length && steps.every((step) => Boolean(step.action)) ? steps : undefined;
}

function LifiDetailsSteps({
  tx,
  steps,
}: {
  tx: MergedTransaction;
  steps: NonNullable<ReturnType<typeof getDetailedLifiRouteSteps>>;
}) {
  const isSourceChainDepositFailure = isSourceChainStatusFailure(tx);
  const isDestinationChainFailure = isDestinationChainStatusFailure(tx);
  const sourceNetworkName = getNetworkName(tx.sourceChainId);
  const destinationNetworkName = getNetworkName(tx.destinationChainId);

  return (
    <div className="flex flex-col text-xs">
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

      {steps.flatMap((step, index) => {
        const chainName = getNetworkName(step.action.fromChainId);
        const approvalState = getLifiStepProcessState(step, LIFI_APPROVAL_PROCESS_TYPES, {
          fallbackToAllProcesses: true,
        });
        const transferState = getLifiStepProcessState(step, LIFI_TRANSFER_PROCESS_TYPES);

        return [
          <Step
            key={`${step.id || index}-approve-transaction`}
            done={approvalState === 'done'}
            pending={approvalState === 'pending'}
            failure={approvalState === 'failure'}
            text={`Approve transaction on ${chainName}`}
          />,
          <Step
            key={`${step.id || index}-approve-transfer`}
            done={transferState === 'done'}
            pending={transferState === 'pending'}
            failure={transferState === 'failure'}
            text={`Approve transfer on ${chainName}`}
          />,
        ];
      })}

      <Step
        done={isTxCompleted(tx)}
        pending={isTxPending(tx) && !isTxCompleted(tx)}
        failure={isTxExpired(tx) || isDestinationChainFailure}
        text={`Funds arrive on ${destinationNetworkName}`}
        endItem={<LastStepEndItem tx={tx} />}
      />
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
      return <TransactionFailedOnNetwork networkName={networkName} />;
    }
    if (isDestinationChainFailure) {
      if (isLifiRefunded) {
        return `Funds refunded on ${sourceNetworkName}`;
      }
      return `Transaction failed on ${networkName}.`;
    }
    return fundsArrivedText;
  }, [tx, isDestinationChainFailure, sourceNetworkName, isLifiRefunded]);

  const detailedLifiRouteSteps = getDetailedLifiRouteSteps(tx);
  if (detailedLifiRouteSteps) {
    return <LifiDetailsSteps tx={tx} steps={detailedLifiRouteSteps} />;
  }

  return (
    <div className="flex flex-col text-xs">
      {/* First step when transfer is initiated */}
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
                isError={false}
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
