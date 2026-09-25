import useSWR from 'swr';

import { trackEvent } from '@/bridge/util/AnalyticsUtils';
import { getNetworkName } from '@/bridge/util/networks';
import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import {
  RetryableLookupResult,
  getRedeemableChain,
  isValidTxHash,
  lookupRetryables,
} from './retryableLookup';

export function useRetryableLookup({
  childChainId,
  parentChainTxHash,
}: {
  childChainId: number | undefined;
  parentChainTxHash: string | undefined;
}) {
  const chain = typeof childChainId === 'number' ? getRedeemableChain(childChainId) : undefined;

  // reported from here rather than from a render, so one event means one lookup
  function trackResult(
    result: RetryableLookupResult['type'] | 'lookupFailed',
    ticketCount: number,
  ) {
    if (!chain) {
      return;
    }

    trackEvent('Check Retryable Status Result', {
      network: getNetworkName(chain.chainId),
      result,
      ticketCount,
    });
  }

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
      shouldRetryOnError: false,
      onSuccess: (result) =>
        trackResult(result.type, result.type === 'retryables' ? result.retryables.length : 0),
      onError: () => trackResult('lookupFailed', 0),
    },
  );
}
