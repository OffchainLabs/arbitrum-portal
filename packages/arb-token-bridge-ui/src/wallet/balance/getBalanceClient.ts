import { getWalletEcosystem } from '../getWalletEcosystem';
import type { BalanceClient } from '../types';

type BalanceClients = {
  evm: BalanceClient;
  solana?: BalanceClient;
};

export function createBalanceClientResolver({ evm, solana }: BalanceClients) {
  return (chainId: number): BalanceClient => {
    if (getWalletEcosystem(chainId) === 'evm') {
      return evm;
    }

    if (!solana) {
      throw new Error('Solana balance client is not available.');
    }

    return solana;
  };
}
