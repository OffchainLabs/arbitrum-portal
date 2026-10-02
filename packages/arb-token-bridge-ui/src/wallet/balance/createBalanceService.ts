import { normalizeAddress } from '../../util/AddressUtils';
import type { BalanceClient, FetchBalanceInput, FetchBalanceResult } from '../types';

type BalanceClientResolver = (chainId: number) => BalanceClient;

export type BalanceService = {
  fetchBalances: (input: FetchBalanceInput) => Promise<FetchBalanceResult>;
};

export function createBalanceService(resolveClient: BalanceClientResolver): BalanceService {
  return {
    async fetchBalances({ chainId, walletAddress, tokenAddresses }) {
      if (tokenAddresses.length === 0) {
        return {};
      }

      const balances = await resolveClient(chainId).fetchBalance({
        chainId,
        walletAddress: normalizeAddress(walletAddress),
        tokenAddresses: [...new Set(tokenAddresses.map((address) => normalizeAddress(address)))],
      });
      const result: FetchBalanceResult = {};
      for (const address of tokenAddresses) {
        const balance = balances[normalizeAddress(address)];
        if (balance !== undefined) result[address] = balance;
      }
      return result;
    },
  };
}
