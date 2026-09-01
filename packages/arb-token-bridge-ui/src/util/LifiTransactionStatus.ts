import type { Process, ProcessStatus, ProcessType, RouteExtended } from '@lifi/sdk';
import type { StatusResponse } from '@lifi/types';
import { utils } from 'ethers';

import { WithdrawalStatus } from '../state/app/state';

export const LIFI_TRANSFER_PROCESS_TYPES: ReadonlySet<ProcessType> = new Set([
  'CROSS_CHAIN',
  'SWAP',
  'TRANSACTION',
]);
const SUBMITTED_ROUTE_PROCESS_STATUSES: ReadonlySet<ProcessStatus> = new Set(['PENDING', 'DONE']);

export function isValidLifiTransactionHash(txHash: string | null | undefined): txHash is string {
  return typeof txHash === 'string' && utils.isHexString(txHash, 32);
}

export function isPendingLifiProcessId(process: { txType?: string; txLink?: string }) {
  return (
    process.txType !== undefined &&
    process.txType !== 'standard' &&
    typeof process.txLink !== 'string'
  );
}

function findLifiRouteProcess(
  route: RouteExtended | undefined,
  predicate: (process: Process) => boolean,
) {
  for (const step of route?.steps ?? []) {
    const routeProcess = step.execution?.process.find(predicate);
    if (routeProcess) {
      return routeProcess;
    }
  }

  return undefined;
}

function getSubmittedLifiRouteProcess(route: RouteExtended | undefined) {
  return findLifiRouteProcess(
    route,
    (process) =>
      typeof process.txHash === 'string' &&
      SUBMITTED_ROUTE_PROCESS_STATUSES.has(process.status) &&
      LIFI_TRANSFER_PROCESS_TYPES.has(process.type),
  );
}

export function getSubmittedLifiRouteTxHash(route: RouteExtended | undefined) {
  return getSubmittedLifiRouteProcess(route)?.txHash;
}

export function getExecutedLifiRouteTxHash(route: RouteExtended | undefined) {
  return findLifiRouteProcess(
    route,
    (process) =>
      typeof process.txHash === 'string' &&
      LIFI_TRANSFER_PROCESS_TYPES.has(process.type) &&
      !isPendingLifiProcessId(process) &&
      isValidLifiTransactionHash(process.txHash),
  )?.txHash;
}

export function getPendingLifiRouteBatchId(route: RouteExtended | undefined) {
  return findLifiRouteProcess(
    route,
    (process) =>
      typeof process.txHash === 'string' &&
      LIFI_TRANSFER_PROCESS_TYPES.has(process.type) &&
      isPendingLifiProcessId(process),
  )?.txHash;
}

export function resolveLifiRouteBatchId({
  route,
  batchId,
  txHash,
  txLink,
}: {
  route: RouteExtended;
  batchId: string;
  txHash: string;
  txLink: string;
}): RouteExtended {
  return {
    ...route,
    steps: route.steps.map((step) => ({
      ...step,
      execution: step.execution
        ? {
            ...step.execution,
            process: step.execution.process.map((process) =>
              process.txHash === batchId && isPendingLifiProcessId(process)
                ? { ...process, txHash, txLink }
                : process,
            ),
          }
        : undefined,
    })),
  };
}

export function getLifiRouteStatusRequest(route: RouteExtended | undefined) {
  for (const [stepIndex, step] of (route?.steps ?? []).entries()) {
    const crossChainProcess = step.execution?.process.find(
      (process) => process.type === 'CROSS_CHAIN' && process.status !== 'FAILED',
    );
    const txHash = crossChainProcess?.txHash;

    if (
      crossChainProcess &&
      !isPendingLifiProcessId(crossChainProcess) &&
      isValidLifiTransactionHash(txHash)
    ) {
      return {
        params: {
          txHash,
          bridge: step.tool,
          fromChain: step.action.fromChainId.toString(),
          toChain: step.action.toChainId.toString(),
        },
        stepIndex,
      };
    }
  }

  return undefined;
}

export function getLifiTransferStatus(statusResponse: StatusResponse): {
  status: WithdrawalStatus;
  destinationStatus: WithdrawalStatus;
  destinationTxId: string | null;
} {
  let status: WithdrawalStatus;
  let destinationStatus: WithdrawalStatus;
  let destinationTxId: string | null = null;

  if (statusResponse.status === 'DONE') {
    if (statusResponse.substatus === 'REFUNDED') {
      status = WithdrawalStatus.REFUNDED;
      destinationStatus = WithdrawalStatus.REFUNDED;
    } else {
      status = WithdrawalStatus.CONFIRMED;
      destinationStatus = WithdrawalStatus.CONFIRMED;
    }
    if ('txHash' in statusResponse.receiving) {
      destinationTxId = statusResponse.receiving.txHash;
    }
  } else if (statusResponse.status === 'PENDING') {
    if ('timestamp' in statusResponse.sending) {
      status = WithdrawalStatus.CONFIRMED;
      destinationStatus = WithdrawalStatus.UNCONFIRMED;
    } else {
      status = WithdrawalStatus.UNCONFIRMED;
      destinationStatus = WithdrawalStatus.UNCONFIRMED;
    }
    if ('txHash' in statusResponse.receiving) {
      destinationTxId = statusResponse.receiving.txHash;
    }
  } else {
    if ('timestamp' in statusResponse.sending) {
      status = WithdrawalStatus.CONFIRMED;
      destinationStatus = WithdrawalStatus.REFUNDED;
    } else {
      status = WithdrawalStatus.REFUNDED;
      destinationStatus = WithdrawalStatus.UNCONFIRMED;
    }
  }

  return {
    status,
    destinationStatus,
    destinationTxId,
  };
}
