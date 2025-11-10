import { ArbitrumNetwork, EthBridger, getArbitrumNetwork } from '@arbitrum/sdk';
import { Provider, StaticJsonRpcProvider } from '@ethersproject/providers';
import useSWRImmutable from 'swr/immutable';

import { ETHER_TOKEN_LOGO, ether } from '../constants';
import { ChainId } from '../types/ChainId';
import { addressesEqual } from '../util/AddressUtils';
import { CommonAddress } from '../util/CommonAddressUtils';
import { fetchErc20Data } from '../util/TokenUtils';
import { getBridgeUiConfigForChain } from '../util/bridgeUiConfig';
import { rpcURLs } from '../util/networks';
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
      fetchNativeCurrency({ provider: _provider, parentChainId: _parentChainId }),
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
  parentChainId,
}: {
  provider: Provider;
  parentChainId?: number;
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

  // This parent chain id, is the canonical parent chain id (e.g., ArbitrumOne for ApeChain)
  // parent chain id from parameter is the current "parent" chain id from query param
  const canonicalParentChainId = chain.parentChainId;
  const parentChainProvider = new StaticJsonRpcProvider(rpcURLs[canonicalParentChainId]);

  const { name, symbol, decimals } = await fetchErc20Data({
    address,
    provider: parentChainProvider,
  });

  /**
   * When transferring Ape token from Base or Ethereum, address from ethBridger is incorrect
   * It should be the address of the Ape token on the source chain
   */
  if (
    addressesEqual(address, CommonAddress.ArbitrumOne.APE) &&
    (parentChainId === ChainId.Base || parentChainId === ChainId.Ethereum) &&
    (await provider.getNetwork()).chainId === ChainId.ApeChain
  ) {
    address = parentChainId === ChainId.Base ? CommonAddress.Base.APE : CommonAddress.Ethereum.APE;
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
