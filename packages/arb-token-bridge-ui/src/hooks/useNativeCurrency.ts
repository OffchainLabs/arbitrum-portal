import { constants } from 'ethers';
import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { nativeCurrencyEther } from '../services/evm/nativeCurrency';
import { fetchNativeCurrency } from '../services/nativeCurrency';
import { type Address, addressesEqual, normalizeAddress } from '../util/AddressUtils';
import { getChainMetadata } from '../util/networkMetadata';
import { isNetwork } from '../util/networks';
import { getNativeTokenAddress } from '../wallet/ecosystems/getEcosystemConfig';
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

export type TransferNativeCurrency = NativeCurrency & {
  balanceDecimals: number;
  /** Chain shown in "Native token on …", undefined when both chains use a custom gas token */
  nativeTokenChainId: number | undefined;
  /** Key of the native token price in the token lists, undefined for the ETH price */
  priceAddress: Address | undefined;
};

/**
 * Native currency of a token row or amount input.
 * Within one ecosystem it is the child chain's currency; across ecosystems each side uses its own chain's.
 * The zero address token is ETH (e.g. next to APE on ApeChain routes).
 */
export function useNativeCurrencyForTransfer({
  isDestination = false,
  tokenAddress,
}: { isDestination?: boolean; tokenAddress?: string } = {}): TransferNativeCurrency {
  const [networks] = useNetworks();
  const { childChain } = useNetworksRelationship(networks);
  const sourceChainId = networks.sourceChain.id;
  const destinationChainId = networks.destinationChain.id;
  const sourceCurrency = useNativeCurrency({ chainId: sourceChainId });
  const destinationCurrency = useNativeCurrency({ chainId: destinationChainId });

  // Stable reference for memoized consumers (e.g. the token list in TokenSearch)
  return useMemo(() => {
    const isCrossEcosystem =
      getWalletEcosystem(sourceChainId) !== getWalletEcosystem(destinationChainId);
    const rowChainId = isDestination ? destinationChainId : sourceChainId;
    const currencyChainId = isCrossEcosystem ? rowChainId : childChain.id;
    const isEth = addressesEqual(tokenAddress, constants.AddressZero);
    const nativeCurrency: NativeCurrency = isEth
      ? nativeCurrencyEther
      : currencyChainId === sourceChainId
        ? sourceCurrency
        : destinationCurrency;
    const nativeTokenAddress = getNativeTokenAddress(currencyChainId);
    const priceAddress = isEth
      ? undefined
      : nativeCurrency.isCustom
        ? normalizeAddress(nativeCurrency.address)
        : addressesEqual(nativeTokenAddress, constants.AddressZero)
          ? undefined
          : nativeTokenAddress;
    const nativeTokenChainId = isEth
      ? sourceCurrency.isCustom && destinationCurrency.isCustom
        ? undefined
        : sourceCurrency.isCustom
          ? destinationChainId
          : sourceChainId
      : isCrossEcosystem
        ? rowChainId
        : nativeCurrency.isCustom
          ? childChain.id
          : sourceChainId;
    const balanceDecimals = isDestination
      ? destinationCurrency.decimals
      : isNetwork(sourceChainId).isOrbitChain
        ? 18
        : nativeCurrency.decimals;

    return { ...nativeCurrency, balanceDecimals, nativeTokenChainId, priceAddress };
  }, [
    sourceChainId,
    destinationChainId,
    childChain.id,
    sourceCurrency,
    destinationCurrency,
    isDestination,
    tokenAddress,
  ]);
}
