import { getEvmNetworksRelationship } from '../services/evm/networkRelationship';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem } from '../wallet/types';

const relationships: Record<WalletEcosystem, typeof getEvmNetworksRelationship> = {
  evm: getEvmNetworksRelationship,
  solana: ({ sourceChainId, destinationChainId }) => ({
    parentChainId: sourceChainId,
    childChainId: destinationChainId,
    isDepositMode: true,
  }),
};

export function getNetworksRelationship(input: Parameters<typeof getEvmNetworksRelationship>[0]) {
  return relationships[getWalletEcosystem(input.sourceChainId)](input);
}
