import { getEvmNetworksRelationship } from '../services/evm/networkRelationship';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem } from '../wallet/types';

const sameEcosystemRelationships: Partial<
  Record<WalletEcosystem, typeof getEvmNetworksRelationship>
> = {
  evm: getEvmNetworksRelationship,
};

export function getNetworksRelationship(input: Parameters<typeof getEvmNetworksRelationship>[0]) {
  const sourceEcosystem = getWalletEcosystem(input.sourceChainId);
  const destinationEcosystem = getWalletEcosystem(input.destinationChainId);
  if (sourceEcosystem !== destinationEcosystem) {
    return {
      parentChainId: input.sourceChainId,
      childChainId: input.destinationChainId,
      isDepositMode: true,
    };
  }

  const getRelationship = sameEcosystemRelationships[sourceEcosystem];
  if (!getRelationship) {
    throw new Error(`Network relationships are unavailable for ${sourceEcosystem}.`);
  }
  return getRelationship(input);
}
