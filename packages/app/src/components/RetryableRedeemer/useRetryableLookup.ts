import useSWR from 'swr';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { getRedeemableChain, lookupRetryables } from './retryableLookup';

export function useRetryableLookup({
  childChainId,
  parentChainTxHash,
}: {
  childChainId: number | undefined;
  parentChainTxHash: string | undefined;
}) {
  const chain = typeof childChainId === 'number' ? getRedeemableChain(childChainId) : undefined;

  return useSWR(
    chain && parentChainTxHash
      ? ([
          chain.chainId,
          chain.parentChainId,
          chain.inbox,
          parentChainTxHash,
          'retryableLookup',
        ] as const)
      : null,
    ([_childChainId, parentChainId, inbox, txHash]) =>
      lookupRetryables({
        parentChainTxHash: txHash,
        parentChainProvider: getProviderForChainId(parentChainId),
        childChainProvider: getProviderForChainId(_childChainId),
        inbox,
      }),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
    },
  );
}
