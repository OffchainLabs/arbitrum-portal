import { getNetworkMetadata } from '../util/networkMetadata';
import type { WalletEcosystem } from './types';

export function getWalletEcosystem(chainId: number): WalletEcosystem {
  return getNetworkMetadata(chainId).ecosystem;
}
