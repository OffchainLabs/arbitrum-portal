import type { ContractStorage, ERC20BridgeToken } from '../hooks/arbTokenBridge.types';
import type { NativeCurrency } from '../hooks/useNativeCurrency';
import { getBridgeUiConfigForChain } from '../util/bridgeUiConfig';
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
    : {
        ...getChainMetadata(params.chainId).nativeCurrency,
        isCustom: false,
        logoUrl: getBridgeUiConfigForChain(params.chainId).nativeTokenData?.logoUrl,
      };
}

export function getNativeCurrencyPrice({
  priceAddress,
  tokensFromLists,
  ethPrice,
}: {
  priceAddress: string | undefined;
  tokensFromLists: ContractStorage<ERC20BridgeToken>;
  ethPrice: number;
}): number | undefined {
  return priceAddress ? tokensFromLists[priceAddress]?.priceUSD : ethPrice;
}
