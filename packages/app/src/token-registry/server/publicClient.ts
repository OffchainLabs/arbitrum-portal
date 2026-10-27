import { createPublicClient, http } from 'viem';

import { rpcURLs } from '@/bridge/util/networks';

export function getPublicClient(chainId: number) {
  const url = rpcURLs[chainId];
  if (!url) {
    throw new Error(`No RPC URL configured for chain ${chainId}`);
  }
  return createPublicClient({ transport: http(url) });
}
