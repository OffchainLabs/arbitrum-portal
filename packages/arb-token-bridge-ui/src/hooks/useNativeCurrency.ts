import { constants } from 'ethers';
import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { nativeCurrencyEther } from '../services/evm/nativeCurrency';
import { fetchNativeCurrency } from '../services/nativeCurrency';
import { addressesEqual, normalizeAddress } from '../util/AddressUtils';
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
  priceAddress: string | undefined;
};

/**
 * Native currency of a token row or amount input.
 * Within one ecosystem it is the child chain's currency; across ecosystems each side uses its own chain's.
 * Within one ecosystem the zero address token is ETH (e.g. next to APE on ApeChain routes). Across
 * ecosystems it is the row chain's native token, as LiFi lists it.
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
  return useMemo(
    () =>
      getTransferNativeCurrency({
        sourceChainId,
        destinationChainId,
        childChainId: childChain.id,
        sourceCurrency,
        destinationCurrency,
        isDestination,
        tokenAddress,
      }),
    [
      sourceChainId,
      destinationChainId,
      childChain.id,
      sourceCurrency,
      destinationCurrency,
      isDestination,
      tokenAddress,
    ],
  );
}

type TransferNativeCurrencyParams = {
  sourceChainId: number;
  destinationChainId: number;
  childChainId: number;
  sourceCurrency: NativeCurrency;
  destinationCurrency: NativeCurrency;
  isDestination: boolean;
  tokenAddress: string | undefined;
};

function getTransferNativeCurrency(params: TransferNativeCurrencyParams): TransferNativeCurrency {
  const {
    sourceChainId,
    destinationChainId,
    childChainId,
    sourceCurrency,
    destinationCurrency,
    isDestination,
  } = params;

  const isCrossEcosystem =
    getWalletEcosystem(sourceChainId) !== getWalletEcosystem(destinationChainId);

  if (!isCrossEcosystem && addressesEqual(params.tokenAddress, constants.AddressZero)) {
    return {
      ...nativeCurrencyEther,
      balanceDecimals: getBalanceDecimals(params, nativeCurrencyEther),
      nativeTokenChainId: getEthChainId(params),
      priceAddress: undefined,
    };
  }

  if (isCrossEcosystem) {
    const chainId = isDestination ? destinationChainId : sourceChainId;
    const currency = isDestination ? destinationCurrency : sourceCurrency;
    return {
      ...currency,
      balanceDecimals: getBalanceDecimals(params, currency),
      nativeTokenChainId: chainId,
      priceAddress: getPriceAddress(currency, chainId),
    };
  }

  const currency = childChainId === sourceChainId ? sourceCurrency : destinationCurrency;
  return {
    ...currency,
    balanceDecimals: getBalanceDecimals(params, currency),
    nativeTokenChainId: currency.isCustom ? childChainId : sourceChainId,
    priceAddress: getPriceAddress(currency, childChainId),
  };
}

function getBalanceDecimals(
  { isDestination, sourceChainId, destinationCurrency }: TransferNativeCurrencyParams,
  currency: NativeCurrency,
): number {
  if (isDestination) return destinationCurrency.decimals;
  // An Orbit chain's native balance has 18 decimals, whatever its parent chain token has
  if (isNetwork(sourceChainId).isOrbitChain) return 18;
  return currency.decimals;
}

// ETH is listed on the side whose gas token is ETH
function getEthChainId({
  sourceChainId,
  destinationChainId,
  sourceCurrency,
  destinationCurrency,
}: TransferNativeCurrencyParams): number | undefined {
  if (!sourceCurrency.isCustom) return sourceChainId;
  if (!destinationCurrency.isCustom) return destinationChainId;
  return undefined;
}

function getPriceAddress(currency: NativeCurrency, chainId: number): string | undefined {
  if (currency.isCustom) return normalizeAddress(currency.address);
  const nativeTokenAddress = getNativeTokenAddress(chainId);
  // The zero address means the ETH price
  return addressesEqual(nativeTokenAddress, constants.AddressZero) ? undefined : nativeTokenAddress;
}
