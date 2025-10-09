import {
  ParentToChildMessageWriter as IParentToChildMessageWriter,
  ParentTransactionReceipt,
} from '@arbitrum/sdk';
import { Provider } from '@ethersproject/abstract-provider';
import { Signer } from '@ethersproject/abstract-signer';
import { JsonRpcProvider } from '@ethersproject/providers';
import dayjs from 'dayjs';

import { MergedTransaction } from '../state/app/state';
import { normalizeTimestamp } from '../state/app/utils';

type GetRetryableTicketParams = {
  parentChainTxHash: string;
  retryableCreationId?: string;
  parentChainProvider: Provider;
  childChainSigner: Signer;
};

type GetRetryableTicketExpirationParams = {
  parentChainTxHash: string;
  parentChainProvider: JsonRpcProvider;
  childChainProvider: JsonRpcProvider;
};

type RetryableTicketExpirationResponse = {
  isLoading: boolean;
  isLoadingError: boolean;
  expirationDate: number;
  daysUntilExpired: number;
  isExpired: boolean;
};

export async function getRetryableTicket({
  parentChainTxHash,
  retryableCreationId,
  parentChainProvider,
  childChainSigner,
}: GetRetryableTicketParams): Promise<IParentToChildMessageWriter> {
  if (!retryableCreationId) {
    throw new Error("Error: Couldn't find retryable ticket creation id");
  }

  const parentChainTxReceipt = new ParentTransactionReceipt(
    await parentChainProvider.getTransactionReceipt(parentChainTxHash),
  );

  const retryableTicket = (await parentChainTxReceipt.getParentToChildMessages(childChainSigner))
    // Find message with the matching id
    .find((m) => m.retryableCreationId === retryableCreationId);

  if (typeof retryableTicket === 'undefined') {
    throw new Error("Error: Couldn't find retryable ticket");
  }

  return retryableTicket;
}

export const getRetryableTicketExpiration = async ({
  parentChainTxHash,
  parentChainProvider,
  childChainProvider,
}: GetRetryableTicketExpirationParams): Promise<RetryableTicketExpirationResponse> => {
  let isLoading = true,
    isLoadingError = false,
    isExpired = false;

  let daysUntilExpired = 0;
  let expirationDate = 0;

  try {
    const depositTxReceipt = await parentChainProvider.getTransactionReceipt(parentChainTxHash);
    const parentChainTxReceipt = new ParentTransactionReceipt(depositTxReceipt);
    const [parentToChildMsg] =
      await parentChainTxReceipt.getParentToChildMessages(childChainProvider);

    const now = dayjs();

    const expiryDateResponse = await parentToChildMsg!.getTimeout();
    expirationDate = normalizeTimestamp(expiryDateResponse.toNumber());

    daysUntilExpired = dayjs(expirationDate).diff(now, 'days');

    if (daysUntilExpired >= 0) isExpired = false;
  } catch (_) {
    isLoadingError = true;
  }

  isLoading = false;

  return {
    // promise loading state
    isLoading,
    isLoadingError,

    // expiration state
    expirationDate,
    daysUntilExpired,
    isExpired,
  };
};

export const getChainIdForRedeemingRetryable = (tx: MergedTransaction) => {
  return tx.childChainId;
};
