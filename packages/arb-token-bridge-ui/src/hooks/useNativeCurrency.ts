import type { Provider } from '@ethersproject/providers';
import useSWRImmutable from 'swr/immutable';

import { ETHER_TOKEN_LOGO, ether } from '../constants';
import { fetchEvmNativeCurrency } from '../services/evm/nativeCurrency';
import { fetchNativeCurrency } from '../services/nativeCurrency';
import { getWagmiChain } from '../util/wagmi/getWagmiChain';
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

const nativeCurrencyEther: NativeCurrencyEther = {
  ...ether,
  logoUrl: ETHER_TOKEN_LOGO,
  isCustom: false,
};

type UseNativeCurrencyParams = { chainId: number } | { provider: Provider };

export function useNativeCurrency(params: UseNativeCurrencyParams): NativeCurrency {
  const [networks] = useNetworks();
  const { parentChain } = useNetworksRelationship(networks);
  const { data: currencyForChain } = useSWRImmutable(
    'chainId' in params ? [params.chainId, parentChain.id, 'nativeCurrency'] : null,
    ([chainId, parentChainIdFromQueryParam]) =>
      fetchNativeCurrency({ chainId, parentChainIdFromQueryParam }),
    { shouldRetryOnError: true, errorRetryCount: 2, errorRetryInterval: 1000 },
  );
  const { data: currencyForProvider = nativeCurrencyEther } = useSWRImmutable(
    'provider' in params ? [params.provider, parentChain.id, 'nativeCurrency'] : null,
    ([provider, parentChainIdFromQueryParam]) =>
      fetchEvmNativeCurrency({ provider, parentChainIdFromQueryParam }),
    { shouldRetryOnError: true, errorRetryCount: 2, errorRetryInterval: 1000 },
  );

  return 'chainId' in params
    ? (currencyForChain ?? { ...getWagmiChain(params.chainId).nativeCurrency, isCustom: false })
    : currencyForProvider;
}
