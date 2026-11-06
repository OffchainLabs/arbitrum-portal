import type { NativeCurrency } from '../hooks/useNativeCurrency';
import { getProviderForChainId } from '../token-bridge-sdk/utils';
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
