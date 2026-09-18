import useSWRImmutable from 'swr/immutable';

import { fetchNativeCurrency } from '../services/nativeCurrency';
import type { NativeCurrency } from '../types/NativeCurrency';
import { getWagmiChain } from '../util/wagmi/getWagmiChain';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';

export type { NativeCurrency, NativeCurrencyBase, NativeCurrencyEther, NativeCurrencyErc20 } from '../types/NativeCurrency';

export function useNativeCurrency({ chainId }: { chainId: number }): NativeCurrency {
  const [networks] = useNetworks();
  const { parentChain } = useNetworksRelationship(networks);
  const { data } = useSWRImmutable(
    [chainId, parentChain.id, 'nativeCurrency'] as const,
    ([chainId, parentChainIdFromQueryParam]) =>
      fetchNativeCurrency({ chainId, parentChainIdFromQueryParam }),
    { shouldRetryOnError: true, errorRetryCount: 2, errorRetryInterval: 1000 },
  );
  if (data) return data;
  try {
    return { ...getWagmiChain(chainId).nativeCurrency, isCustom: false };
  } catch {
    return { name: 'Native currency', symbol: 'Unknown', decimals: 18, isCustom: false };
  }
}
