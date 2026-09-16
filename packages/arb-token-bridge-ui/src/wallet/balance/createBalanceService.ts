import type { BalanceClient, FetchBalanceInput, FetchBalanceResult } from '../types';

type BalanceClientResolver = (chainId: number) => BalanceClient;

function getAccountKey(chainId: number, walletAddress: string) {
  return `${chainId}:${walletAddress}`;
}

export type BalanceService = {
  subscribe: (input: FetchBalanceInput) => () => void;
  fetchBalances: (input: Omit<FetchBalanceInput, 'tokenAddresses'>) => Promise<FetchBalanceResult>;
};

/**
 * Owns the complete token set requested for each chain/account pair. Consumers
 * share one SWR entry and every refresh reloads that complete set.
 */
export function createBalanceService(resolveClient: BalanceClientResolver): BalanceService {
  const subscriptionsByAccount = new Map<string, Map<string, number>>();
  const subscribe = ({ chainId, walletAddress, tokenAddresses }: FetchBalanceInput) => {
    const accountKey = getAccountKey(chainId, walletAddress);
    const subscriptions = subscriptionsByAccount.get(accountKey) ?? new Map<string, number>();

    tokenAddresses.forEach((tokenAddress) => {
      subscriptions.set(tokenAddress, (subscriptions.get(tokenAddress) ?? 0) + 1);
    });
    subscriptionsByAccount.set(accountKey, subscriptions);

    return () => {
      tokenAddresses.forEach((tokenAddress) => {
        const subscriberCount = subscriptions.get(tokenAddress) ?? 0;

        if (subscriberCount <= 1) {
          subscriptions.delete(tokenAddress);
        } else {
          subscriptions.set(tokenAddress, subscriberCount - 1);
        }
      });

      if (subscriptions.size === 0) {
        subscriptionsByAccount.delete(accountKey);
      }
    };
  };

  return {
    subscribe,

    fetchBalances({ chainId, walletAddress }) {
      const tokenAddresses = Array.from(
        subscriptionsByAccount.get(getAccountKey(chainId, walletAddress))?.keys() ?? [],
      );

      if (tokenAddresses.length === 0) {
        return Promise.resolve({});
      }

      return resolveClient(chainId).fetchBalance({ chainId, walletAddress, tokenAddresses });
    },
  };
}
