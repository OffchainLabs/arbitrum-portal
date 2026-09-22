import useSWR from 'swr';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { getRedeemableChain, isValidTxHash, lookupRetryables } from './retryableLookup';

export function useRetryableLookup({
  childChainId,
  parentChainTxHash,
}: {
  childChainId: number | undefined;
  parentChainTxHash: string | undefined;
}) {
  const chain = typeof childChainId === 'number' ? getRedeemableChain(childChainId) : undefined;

  // re-checked here rather than trusted from the caller, so no malformed hash can reach an RPC
  return useSWR(
    chain && parentChainTxHash && isValidTxHash(parentChainTxHash)
      ? ([
          chain.chainId,
          chain.parentChainId,
          chain.inbox,
          parentChainTxHash,
          'retryableLookup',
        ] as const)
      : null,
    ([childChainId_, parentChainId, inbox, txHash]) =>
      lookupRetryables({
        parentChainTxHash: txHash,
        parentChainProvider: getProviderForChainId(parentChainId),
        childChainProvider: getProviderForChainId(childChainId_),
        childChain: { chainId: childChainId_, parentChainId, inbox },
      }),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
    },
  );
}
