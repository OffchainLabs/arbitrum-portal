import type { StatusResponse } from '@lifi/types';

import { WithdrawalStatus } from '../state/app/state';

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
      destinationStatus = WithdrawalStatus.FAILURE;
    } else {
      status = WithdrawalStatus.FAILURE;
      destinationStatus = WithdrawalStatus.UNCONFIRMED;
    }
  }

  return {
    status,
    destinationStatus,
    destinationTxId,
  };
}
