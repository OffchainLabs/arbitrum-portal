import { constants } from 'ethers';
import useSWRImmutable from 'swr/immutable';

import { fetchNativeCurrency } from '../services/nativeCurrency';
import { ChainId } from '../types/ChainId';
import { addressesEqual, normalizeAddress } from '../util/AddressUtils';
import { getChainMetadata } from '../util/networkMetadata';
import { isNetwork } from '../util/networks';
import { getNativeTokenPriceAddress } from '../wallet/constants';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
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

export function useNativeCurrencyForTransfer({
  isDestination = false,
  tokenAddress,
}: { isDestination?: boolean; tokenAddress?: string } = {}) {
  const [networks] = useNetworks();
  const { childChain } = useNetworksRelationship(networks);
  const { sourceChain, destinationChain } = networks;
  const crossEcosystem =
    getWalletEcosystem(sourceChain.id) !== getWalletEcosystem(destinationChain.id);
  const rowChainId = isDestination ? destinationChain.id : sourceChain.id;
  const currencyChainId = crossEcosystem ? rowChainId : childChain.id;
  const sourceCurrency = useNativeCurrency({ chainId: sourceChain.id });
  const destinationCurrency = useNativeCurrency({ chainId: destinationChain.id });
  const isEth = addressesEqual(tokenAddress, constants.AddressZero);
  const nativeCurrency: NativeCurrency = isEth
    ? { ...getChainMetadata(ChainId.Ethereum).nativeCurrency, isCustom: false }
    : currencyChainId === sourceChain.id
      ? sourceCurrency
      : destinationCurrency;
  const priceAddress = isEth
    ? undefined
    : nativeCurrency.isCustom
      ? normalizeAddress(nativeCurrency.address)
      : getNativeTokenPriceAddress(currencyChainId);
  const nativeTokenChainId = isEth
    ? sourceCurrency.isCustom && destinationCurrency.isCustom
      ? undefined
      : sourceCurrency.isCustom
        ? destinationChain.id
        : sourceChain.id
    : crossEcosystem
      ? rowChainId
      : nativeCurrency.isCustom
        ? childChain.id
        : sourceChain.id;
  const balanceDecimals = isDestination
    ? destinationCurrency.decimals
    : isNetwork(sourceChain.id).isOrbitChain
      ? 18
      : nativeCurrency.decimals;

  return { ...nativeCurrency, balanceDecimals, nativeTokenChainId, priceAddress };
}
