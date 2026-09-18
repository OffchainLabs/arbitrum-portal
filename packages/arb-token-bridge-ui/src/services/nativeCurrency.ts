import type { ContractStorage, ERC20BridgeToken } from '../hooks/arbTokenBridge.types';
import type { NativeCurrency } from '../hooks/useNativeCurrency';
import { getProviderForChainId } from '../token-bridge-sdk/utils';
import type { Address } from '../util/AddressUtils';
import { fetchEvmNativeCurrency } from './evm/nativeCurrency';

export async function fetchNativeCurrency({
  chainId,
  parentChainIdFromQueryParam,
}: {
  chainId: number;
  parentChainIdFromQueryParam?: number;
}): Promise<NativeCurrency> {
  return fetchEvmNativeCurrency({
    provider: getProviderForChainId(chainId),
    parentChainIdFromQueryParam,
  });
}

export function getNativeCurrencyPrice({
  priceAddress,
  tokensFromLists,
  ethPrice,
}: {
  priceAddress: Address | undefined;
  tokensFromLists: ContractStorage<ERC20BridgeToken>;
  ethPrice: number;
}): number | undefined {
  return priceAddress ? tokensFromLists[priceAddress]?.priceUSD : ethPrice;
}
