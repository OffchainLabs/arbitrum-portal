import type { ProcessType, RouteExtended } from '@lifi/sdk';
import type { StatusResponse } from '@lifi/types';
import { utils } from 'ethers';

import { WithdrawalStatus } from '../state/app/state';

const EXECUTED_ROUTE_PROCESS_TYPES: ReadonlySet<ProcessType> = new Set([
  'CROSS_CHAIN',
  'SWAP',
  'TRANSACTION',
]);

export function isValidLifiTransactionHash(txHash: string | null | undefined) {
  return typeof txHash === 'string' && utils.isHexString(txHash, 32);
}

export function getSubmittedLifiRouteTxHash(route: RouteExtended | undefined) {
  for (const step of route?.steps ?? []) {
    const routeProcess = step.execution?.process.find(
      (process) =>
        typeof process.txHash === 'string' &&
        process.status !== 'FAILED' &&
        EXECUTED_ROUTE_PROCESS_TYPES.has(process.type),
    );

    if (routeProcess?.txHash) {
      return routeProcess.txHash;
    }
  }

  return undefined;
}

export function getExecutedLifiRouteTxHash(route: RouteExtended | undefined) {
  const txHash = getSubmittedLifiRouteTxHash(route);

  return isValidLifiTransactionHash(txHash) ? txHash : undefined;
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
