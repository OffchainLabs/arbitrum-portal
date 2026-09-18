import { constants } from 'ethers';

import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem } from '../wallet/types';

const queries: Record<WalletEcosystem, (chainId: number) => Promise<import('ethers').BigNumber>> = {
  evm: async (chainId) => {
    const { getProviderForChainId } = await import('../token-bridge-sdk/utils');
    return getProviderForChainId(chainId).getGasPrice();
  },
  solana: async () => constants.Zero,
};
export async function fetchGasPrice(chainId: number) {
  return queries[getWalletEcosystem(chainId)](chainId);
}
