import { ChainId } from '../types/ChainId';
import { getWagmiChain } from '../util/wagmi/getWagmiChain';
import type { WalletEcosystem } from './types';

export function getWalletEcosystem(chainId: number): WalletEcosystem {
  if (chainId === ChainId.Solana) {
    return 'solana';
  }

  // Validate against built-in, Orbit, local, and user-configured chains before
  // selecting a wallet. Configured custom chains use the EVM chain model.
  getWagmiChain(chainId);

  return 'evm';
}
