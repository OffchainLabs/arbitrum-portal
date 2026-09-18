import { getWalletEcosystem } from '../getWalletEcosystem';
import type { BalanceClient, WalletEcosystem } from '../types';

export type BalanceClients = Record<WalletEcosystem, BalanceClient>;

export function createBalanceClientResolver(
  clients: BalanceClients,
): (chainId: number) => BalanceClient;
export function createBalanceClientResolver<Ecosystem extends string>(
  clients: Record<NoInfer<Ecosystem>, BalanceClient>,
  getEcosystem: (chainId: number) => Ecosystem,
): (chainId: number) => BalanceClient;
export function createBalanceClientResolver(
  clients: Record<string, BalanceClient>,
  getEcosystem: (chainId: number) => string = getWalletEcosystem,
) {
  return (chainId: number): BalanceClient => {
    const ecosystem = getEcosystem(chainId);
    const client = clients[ecosystem];
    if (!client) {
      throw new Error(`Balance client is not available for ${ecosystem}.`);
    }

    return client;
  };
}
