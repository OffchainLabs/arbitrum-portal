import { getWalletEcosystem } from '../getWalletEcosystem';
import type { BalanceClient, WalletEcosystem } from '../types';

type BalanceClients = Partial<Record<WalletEcosystem, BalanceClient>>;

export function createBalanceClientResolver(clients: BalanceClients) {
  return (chainId: number): BalanceClient => {
    const ecosystem = getWalletEcosystem(chainId);
    const client = clients[ecosystem];
    if (!client) {
      throw new Error(`Balance client is not available for ${ecosystem}.`);
    }

    return client;
  };
}
