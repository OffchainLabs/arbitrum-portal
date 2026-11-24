import type { ContractStorage, ERC20BridgeToken } from '../hooks/arbTokenBridge.types';
import type { NativeCurrency } from '../hooks/useNativeCurrency';
import { getProviderForChainId } from '../token-bridge-sdk/utils';
import { getBridgeUiConfigForChain } from '../util/bridgeUiConfig';
import { getChainMetadata } from '../util/networkMetadata';
import { isLifiOnlyChain } from '../wallet/ecosystems';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem } from '../wallet/types';
import { fetchEvmNativeCurrency } from './evm/nativeCurrency';

type Params = { chainId: number; parentChainIdFromQueryParam?: number };

// The chain metadata has the native currency of chains the Arbitrum SDK doesn't know
function getMetadataNativeCurrency(chainId: number): NativeCurrency {
  return {
    ...getChainMetadata(chainId).nativeCurrency,
    isCustom: false,
    logoUrl: getBridgeUiConfigForChain(chainId).nativeTokenData?.logoUrl,
  };
}

const implementations: Record<WalletEcosystem, (params: Params) => Promise<NativeCurrency>> = {
  evm: async ({ chainId, parentChainIdFromQueryParam }) => {
    // LiFi-only EVM chains, such as Elysium, have a native currency of their own, not a parent chain token
    if (isLifiOnlyChain(chainId)) {
      return getMetadataNativeCurrency(chainId);
    }

    return fetchEvmNativeCurrency({
      provider: getProviderForChainId(chainId),
      parentChainIdFromQueryParam,
    });
  },
  solana: async ({ chainId }) => getMetadataNativeCurrency(chainId),
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
