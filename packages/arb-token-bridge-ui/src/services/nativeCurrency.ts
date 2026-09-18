import type { ContractStorage, ERC20BridgeToken } from '../hooks/arbTokenBridge.types';
import type { NativeCurrency } from '../hooks/useNativeCurrency';
import { getProviderForChainId } from '../token-bridge-sdk/utils';
import { getBridgeUiConfigForChain } from '../util/bridgeUiConfig';
import { getChainMetadata } from '../util/networkMetadata';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem } from '../wallet/types';
import { fetchEvmNativeCurrency } from './evm/nativeCurrency';

type Params = { chainId: number; parentChainIdFromQueryParam?: number };
const implementations: Record<WalletEcosystem, (params: Params) => Promise<NativeCurrency>> = {
  evm: async ({ chainId, parentChainIdFromQueryParam }) => {
    return fetchEvmNativeCurrency({
      provider: getProviderForChainId(chainId),
      parentChainIdFromQueryParam,
    });
  },
  solana: async ({ chainId }) => ({
    ...getChainMetadata(chainId).nativeCurrency,
    isCustom: false,
    logoUrl: getBridgeUiConfigForChain(chainId).nativeTokenData?.logoUrl,
  }),
};
export async function fetchNativeCurrency(params: Params): Promise<NativeCurrency> {
  return implementations[getWalletEcosystem(params.chainId)](params);
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
