import { getWalletEcosystem } from '../getWalletEcosystem';
import type { BalanceClient, WalletEcosystem } from '../types';
import { evmBalanceClient } from './evm';
import { solanaBalanceClient } from './solana';

const balanceClients: Record<WalletEcosystem, BalanceClient> = {
  evm: evmBalanceClient,
  solana: solanaBalanceClient,
};

export function getBalanceClient(chainId: number) {
  return balanceClients[getWalletEcosystem(chainId)];
}
