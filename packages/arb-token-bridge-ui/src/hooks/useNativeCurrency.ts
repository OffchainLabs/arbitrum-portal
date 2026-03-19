import { ArbitrumNetwork, EthBridger, getArbitrumNetwork } from '@arbitrum/sdk';
import { Provider } from '@ethersproject/providers';
import useSWRImmutable from 'swr/immutable';

import { ETHER_TOKEN_LOGO, ether } from '../constants';
import { getProviderForChainId } from '../token-bridge-sdk/utils';
import { ChainId } from '../types/ChainId';
import { addressesEqual } from '../util/AddressUtils';
import { CommonAddress } from '../util/CommonAddressUtils';
import { fetchErc20Data } from '../util/TokenUtils';
import { getBridgeUiConfigForChain } from '../util/bridgeUiConfig';
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

export function useNativeCurrency({ provider }: { provider: Provider }): NativeCurrency {
  const [networks] = useNetworks();
  const { parentChain } = useNetworksRelationship(networks);
  const { data = nativeCurrencyEther } = useSWRImmutable(
    [provider, parentChain.id, 'nativeCurrency'],
    ([_provider, _parentChainId]) =>
      fetchNativeCurrency({ provider: _provider, parentChainIdFromQueryParam: _parentChainId }),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000,
    },
  );

  return data;
}

export async function fetchNativeCurrency({
  provider,
  parentChainIdFromQueryParam,
}: {
  provider: Provider;
  parentChainIdFromQueryParam?: number;
}): Promise<NativeCurrency> {
  let chain: ArbitrumNetwork;

  try {
    chain = await getArbitrumNetwork(provider);
  } catch (error) {
    // This will only throw for L1s, so we can safely assume that the native currency is ETH
    return nativeCurrencyEther;
  }

  const ethBridger = await EthBridger.fromProvider(provider);

  // Could be an L2 or an Orbit chain, but doesn't really matter
  if (typeof ethBridger.nativeToken === 'undefined') {
    return nativeCurrencyEther;
  }

  let address = ethBridger.nativeToken.toLowerCase();

  /** This parent chain id is the parent chain id from ethBridger (e.g., ArbitrumOne for ApeChain) */
  const canonicalParentChainId = chain.parentChainId;
  const parentChainProvider = getProviderForChainId(canonicalParentChainId);

  const { name, symbol, decimals } = await fetchErc20Data({
    address,
    provider: parentChainProvider,
  });

  /**
   * When transferring Ape token from Base or Ethereum, address from ethBridger is the address on Arbitrum One.
   * It should be the address of the Ape token on the source chain instead
   */
  const network = await provider.getNetwork();
  const isApeToken = addressesEqual(address, CommonAddress.ArbitrumOne.APE);
  const isParentBaseOrEthereum =
    parentChainIdFromQueryParam === ChainId.Base ||
    parentChainIdFromQueryParam === ChainId.Ethereum;
  const isChildApeChain = network.chainId === ChainId.ApeChain;

  if (isApeToken && isParentBaseOrEthereum && isChildApeChain) {
    address =
      parentChainIdFromQueryParam === ChainId.Base
        ? CommonAddress.Base.APE
        : CommonAddress.Ethereum.APE;
  }

  return {
    name,
    logoUrl: getBridgeUiConfigForChain(chain.chainId).nativeTokenData?.logoUrl,
    symbol,
    decimals,
    address,
    isCustom: true,
  };
}
