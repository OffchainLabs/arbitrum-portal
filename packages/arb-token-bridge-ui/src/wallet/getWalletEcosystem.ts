import { ChainId } from '../types/ChainId';
import { getCustomChainFromLocalStorageById, rpcURLs } from '../util/networks';
import { orbitChains } from '../util/orbitChainsList';
import type { WalletEcosystem } from './types';

export function getWalletEcosystem(chainId: number): WalletEcosystem {
  if (chainId === ChainId.Solana) {
    return 'solana';
  }

  if (!rpcURLs[chainId] && !orbitChains[chainId] && !getCustomChainFromLocalStorageById(chainId)) {
    throw new Error(`[getWalletEcosystem] Unexpected chain id: ${chainId}`);
  }

  return 'evm';
}

/** Like `getWalletEcosystem`, for chains the bridge may not know, such as those of old history rows */
export function findWalletEcosystem(chainId: number): WalletEcosystem | undefined {
  try {
    return getWalletEcosystem(chainId);
  } catch {
    return undefined;
  }
}
