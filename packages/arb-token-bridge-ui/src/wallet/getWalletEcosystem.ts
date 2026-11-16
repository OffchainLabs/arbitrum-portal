import { getNetworkMetadata } from '../util/networkMetadata';
import type { WalletEcosystem } from './types';

export function getWalletEcosystem(chainId: number): WalletEcosystem {
  return getNetworkMetadata(chainId).ecosystem;
}

/** Like `getWalletEcosystem`, for chains the bridge may not know, such as those of old history rows */
export function findWalletEcosystem(chainId: number): WalletEcosystem | undefined {
  try {
    return getWalletEcosystem(chainId);
  } catch {
    return undefined;
  }
}
