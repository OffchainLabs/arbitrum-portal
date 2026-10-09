import { constants } from 'ethers';
import useSWRImmutable from 'swr/immutable';

import { fetchNativeCurrency } from '../services/nativeCurrency';
import { ChainId } from '../types/ChainId';
import type { NativeCurrency } from '../types/NativeCurrency';
import { addressesEqual, normalizeAddress } from '../util/AddressUtils';
import { getChainMetadata } from '../util/networkMetadata';
import { isNetwork } from '../util/networks';
import { getNativeTokenPriceAddress } from '../wallet/constants';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';

export type {
  NativeCurrency,
  NativeCurrencyBase,
  NativeCurrencyEther,
  NativeCurrencyErc20,
} from '../types/NativeCurrency';

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
    return { ...getChainMetadata(chainId).nativeCurrency, isCustom: false };
  } catch {
    return { name: 'Native currency', symbol: 'Unknown', decimals: 18, isCustom: false };
  }
}

export function useNativeCurrencyForTransfer({
  isDestination = false,
  tokenAddress,
}: { isDestination?: boolean; tokenAddress?: string } = {}) {
  const [networks] = useNetworks();
  const { childChain, isCrossEcosystem } = useNetworksRelationship(networks);
  const { sourceChain, destinationChain } = networks;
  const rowChainId = isDestination ? destinationChain.id : sourceChain.id;
  const currencyChainId = isCrossEcosystem ? rowChainId : childChain.id;
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
    : isCrossEcosystem
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
