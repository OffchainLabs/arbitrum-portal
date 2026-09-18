import { isNetwork } from '../util/networks';
import { useNativeCurrency } from './useNativeCurrency';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';

export const useSourceChainNativeCurrencyDecimals = () => {
  const [networks] = useNetworks();
  const { childChain } = useNetworksRelationship(networks);
  const nativeCurrency = useNativeCurrency({
    chainId: childChain.id,
  });
  const { isOrbitChain: isSourceChainOrbit } = isNetwork(networks.sourceChain.id);

  if (isSourceChainOrbit) {
    return 18;
  }

  return nativeCurrency.decimals;
};
