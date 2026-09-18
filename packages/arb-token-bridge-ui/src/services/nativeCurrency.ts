import type { NativeCurrency } from '../hooks/useNativeCurrency';
import { getChainMetadata } from '../util/networkMetadata';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem } from '../wallet/types';

type Params = { chainId: number; parentChainIdFromQueryParam?: number };
const implementations: Partial<
  Record<WalletEcosystem, (params: Params) => Promise<NativeCurrency>>
> = {
  evm: async ({ chainId, parentChainIdFromQueryParam }) => {
    const [{ fetchEvmNativeCurrency }, { getProviderForChainId }] = await Promise.all([
      import('./evm/nativeCurrency'),
      import('../token-bridge-sdk/utils'),
    ]);
    return fetchEvmNativeCurrency({
      provider: getProviderForChainId(chainId),
      parentChainIdFromQueryParam,
    });
  },
};
export async function fetchNativeCurrency(params: Params): Promise<NativeCurrency> {
  const implementation = implementations[getWalletEcosystem(params.chainId)];
  return implementation
    ? implementation(params)
    : { ...getChainMetadata(params.chainId).nativeCurrency, isCustom: false };
}
