import useSWRImmutable from 'swr/immutable';

import { fetchNativeCurrency } from '../services/nativeCurrency';
import { getChainMetadata } from '../util/networkMetadata';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';

export type NativeCurrencyBase = {
  name: string;
  symbol: string;
  decimals: number;
  logoUrl?: string;
};

export type NativeCurrencyEther = NativeCurrencyBase & {
  isCustom: false;
};

export type NativeCurrencyErc20 = NativeCurrencyBase & {
  isCustom: true;
  /**
   * Address of the ERC-20 token contract on the parent chain.
   */
  address: string;
};

export type NativeCurrency = NativeCurrencyEther | NativeCurrencyErc20;

export function useNativeCurrency({ chainId }: { chainId: number }): NativeCurrency {
  const [networks] = useNetworks();
  const { parentChain } = useNetworksRelationship(networks);
  const { data } = useSWRImmutable(
    [chainId, parentChain.id, 'nativeCurrency'] as const,
    ([chainId, parentChainIdFromQueryParam]) =>
      fetchNativeCurrency({ chainId, parentChainIdFromQueryParam }),
    { shouldRetryOnError: true, errorRetryCount: 2, errorRetryInterval: 1000 },
  );
  return data ?? { ...getChainMetadata(chainId).nativeCurrency, isCustom: false };
}
