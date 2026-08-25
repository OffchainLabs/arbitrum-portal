import useSWRImmutable from 'swr/immutable';

import type { LifiTransactionHistoryResponse } from '../app/api/crosschain-transfers/lifi/transactions';
import type { LifiMergedTransaction } from '../state/app/state';
import { getAPIBaseUrl } from '../util';
import { useError } from './useError';

export async function fetchLifiTransactionHistory(
  walletAddress: string,
): Promise<LifiMergedTransaction[]> {
  const response = await fetch(
    `${getAPIBaseUrl()}/api/crosschain-transfers/lifi/transactions?wallet=${walletAddress}`,
  );
  const body = (await response.json()) as LifiTransactionHistoryResponse;

  if (!response.ok) {
    throw new Error('message' in body ? body.message : 'Failed to fetch LiFi transaction history');
  }

  if (body.data === null) {
    throw new Error(body.message);
  }

  return body.data;
}

export function useLifiTransactionHistory({
  walletAddress,
}: {
  walletAddress: string | undefined;
}) {
  const { handleError } = useError();
  return useSWRImmutable(
    walletAddress ? ([walletAddress, 'useLifiTransactionHistory'] as const) : null,
    async ([walletAddress]) => fetchLifiTransactionHistory(walletAddress),
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
