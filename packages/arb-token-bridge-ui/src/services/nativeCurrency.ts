import type { NativeCurrency } from '../hooks/useNativeCurrency';
import { getProviderForChainId } from '../token-bridge-sdk/utils';
import { getWagmiChain } from '../util/wagmi/getWagmiChain';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem } from '../wallet/types';
import { fetchEvmNativeCurrency } from './evm/nativeCurrency';

type Params = { chainId: number; parentChainIdFromQueryParam?: number };
const implementations: Partial<
  Record<WalletEcosystem, (params: Params) => Promise<NativeCurrency>>
> = {
  evm: async ({ chainId, parentChainIdFromQueryParam }) => {
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
    : { ...getWagmiChain(params.chainId).nativeCurrency, isCustom: false };
}
