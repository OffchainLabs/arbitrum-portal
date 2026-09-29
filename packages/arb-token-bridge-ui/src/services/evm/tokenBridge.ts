import type { TokenBridgeParams } from '../../hooks/useArbTokenBridge';
import type { UseNetworksState } from '../../hooks/useNetworks';
import { getProviderForChainId } from '../../token-bridge-sdk/utils';
import { getNetworksRelationship } from '../../util/getNetworksRelationship';

export function getEvmTokenBridgeParams(networks: UseNetworksState): TokenBridgeParams {
  const { parentChainId, childChainId } = getNetworksRelationship({
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id,
  });
  return {
    l1: {
      network:
        networks.sourceChain.id === parentChainId
          ? networks.sourceChain
          : networks.destinationChain,
      provider: getProviderForChainId(parentChainId),
    },
    l2: {
      network:
        networks.sourceChain.id === childChainId ? networks.sourceChain : networks.destinationChain,
      provider: getProviderForChainId(childChainId),
    },
  };
}
