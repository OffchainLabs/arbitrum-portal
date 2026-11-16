import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { nativeCurrencyEther } from '../services/evm/nativeCurrency';
import { fetchNativeCurrency } from '../services/nativeCurrency';
import { getChainMetadata } from '../util/networkMetadata';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem } from '../wallet/types';
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
    ([_chainId, _parentChainId]) =>
      fetchNativeCurrency({ chainId: _chainId, parentChainIdFromQueryParam: _parentChainId }),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000,
    },
  );
  // Stable reference while loading, so consumers memoizing on it don't recompute every render
  const fallback = useMemo(() => getFallbackNativeCurrency(chainId), [chainId]);
  return data ?? fallback;
}

const fallbackNativeCurrencies: Record<WalletEcosystem, (chainId: number) => NativeCurrencyEther> =
  {
    evm: () => nativeCurrencyEther,
    solana: (chainId) => ({ ...getChainMetadata(chainId).nativeCurrency, isCustom: false }),
  };

function getFallbackNativeCurrency(chainId: number): NativeCurrencyEther {
  try {
    return fallbackNativeCurrencies[getWalletEcosystem(chainId)](chainId);
  } catch {
    return nativeCurrencyEther;
  }
}
