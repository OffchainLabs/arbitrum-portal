import { ChainId } from '../../types/ChainId';
import type { BalanceClient, EvmBalanceClient, SolanaBalanceClient } from '../types';

type BalanceClients = {
  evm: EvmBalanceClient;
  solana?: SolanaBalanceClient;
};

export function createBalanceClientResolver({ evm, solana }: BalanceClients) {
  return (chainId: number): BalanceClient => {
    if (chainId !== ChainId.Solana) {
      return evm;
    }

    if (!solana) {
      throw new Error('Solana balance client is not available.');
    }

    return solana;
  };
}
