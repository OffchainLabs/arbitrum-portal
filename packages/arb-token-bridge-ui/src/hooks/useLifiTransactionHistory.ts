import { BigNumber } from 'ethers';
import useSWRImmutable from 'swr/immutable';

import type {
  LifiTransactionHistoryItem,
  LifiTransactionHistoryResponse,
} from '../app/api/crosschain-transfers/lifi/transactions';
import type { LifiMergedTransaction } from '../state/app/state';
import { getAPIBaseUrl } from '../util';
import { useError } from './useError';

function deserializeLifiHistoryTransaction(
  transaction: LifiTransactionHistoryItem,
): LifiMergedTransaction {
  return {
    ...transaction,
    fromAmount: {
      ...transaction.fromAmount,
      amount: BigNumber.from(transaction.fromAmount.amount),
    },
    toAmount: {
      ...transaction.toAmount,
      amount: BigNumber.from(transaction.toAmount.amount),
    },
  };
}

export function useLifiTransactionHistory({
  walletAddress,
}: {
  walletAddress: string | undefined;
}) {
  const { handleError } = useError();
  return useSWRImmutable(
    walletAddress ? ([walletAddress, 'useLifiTransactionHistory'] as const) : null,
    async ([walletAddress]) => {
      const response = await fetch(
        `${getAPIBaseUrl()}/api/crosschain-transfers/lifi/transactions?wallet=${walletAddress}`,
      );
      const body = (await response.json()) as LifiTransactionHistoryResponse;

      if (!response.ok) {
        throw new Error(
          'message' in body ? body.message : 'Failed to fetch LiFi transaction history',
        );
      }

      if (body.data === null) {
        throw new Error(body.message);
      }

      return body.data.map(deserializeLifiHistoryTransaction);
    },
    {
      onError(error) {
        handleError({
          error,
          label: 'useLifiTransactionHistory',
          category: 'network_request',
        });
      },
    },
  );
}
