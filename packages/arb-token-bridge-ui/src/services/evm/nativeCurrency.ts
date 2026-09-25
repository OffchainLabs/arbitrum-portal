import { ArbitrumNetwork, EthBridger, getArbitrumNetwork } from '@arbitrum/sdk';
import { Provider } from '@ethersproject/providers';

import { ETHER_TOKEN_LOGO, ether } from '../../constants';
import type { NativeCurrency, NativeCurrencyEther } from '../../hooks/useNativeCurrency';
import { getProviderForChainId } from '../../token-bridge-sdk/utils';
import { ChainId } from '../../types/ChainId';
import { addressesEqual } from '../../util/AddressUtils';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { fetchErc20Data } from '../../util/TokenUtils';
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig';

const nativeCurrencyEther: NativeCurrencyEther = {
  ...ether,
  logoUrl: ETHER_TOKEN_LOGO,
  isCustom: false,
};

export async function fetchEvmNativeCurrency({
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
   * When ApeChain is paired with another parent chain, ethBridger returns the APE address on
   * Arbitrum One. Use the APE address on the selected parent chain instead.
   * It should be the address of the Ape token on the source chain instead
   */
  const network = await provider.getNetwork();
  const isApeToken = addressesEqual(address, CommonAddress.ArbitrumOne.APE);
  const isChildApeChain = network.chainId === ChainId.ApeChain;

  if (isApeToken && isChildApeChain) {
    address =
      {
        [ChainId.Base]: CommonAddress.Base.APE,
        [ChainId.Ethereum]: CommonAddress.Ethereum.APE,
        [ChainId.RobinhoodChain]: CommonAddress.RobinhoodChain.APE,
      }[parentChainIdFromQueryParam ?? 0] ?? address;
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
