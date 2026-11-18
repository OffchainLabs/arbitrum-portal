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

/**
 * Whether a transfer goes between wallet ecosystems, such as Solana to Arbitrum One.
 * Chains the bridge doesn't know, such as those of old history rows, count as the same ecosystem.
 */
export function isCrossEcosystemTransfer({
  sourceChainId,
  destinationChainId,
}: {
  sourceChainId: number;
  destinationChainId: number;
}): boolean {
  const sourceEcosystem = findWalletEcosystem(sourceChainId);
  const destinationEcosystem = findWalletEcosystem(destinationChainId);
  return !!sourceEcosystem && !!destinationEcosystem && sourceEcosystem !== destinationEcosystem;
}
