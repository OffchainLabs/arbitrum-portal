import type { TokenBridgeParams } from '../hooks/useArbTokenBridge';
import type { UseNetworksState } from '../hooks/useNetworks';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem } from '../wallet/types';
import { getEvmTokenBridgeParams } from './evm/tokenBridge';

const implementations: Partial<Record<WalletEcosystem, typeof getEvmTokenBridgeParams>> = {
  evm: getEvmTokenBridgeParams,
};

export function getTokenBridgeParams(networks: UseNetworksState): TokenBridgeParams | null {
  const sourceEcosystem = getWalletEcosystem(networks.sourceChain.id);
  const destinationEcosystem = getWalletEcosystem(networks.destinationChain.id);
  if (sourceEcosystem !== destinationEcosystem) return null;
  return implementations[sourceEcosystem]?.(networks) ?? null;
}
