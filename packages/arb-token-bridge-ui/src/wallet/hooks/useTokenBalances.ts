import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { normalizeAddress } from '../../util/AddressUtils';
import { useBalanceService } from '../balance/BalanceContext';
import type { BalanceService } from '../balance/createBalanceService';

const BALANCE_REFRESH_INTERVAL = 15_000;

export function useTokenBalances({
  chainId,
  walletAddress: inputWalletAddress,
  tokenAddresses,
}: {
  chainId: number;
  walletAddress?: string;
  tokenAddresses: string[];
}) {
  const service = useBalanceService();
  const walletAddress = normalizeAddress(inputWalletAddress);
  const { mutate: mutateCache } = useSWRConfig();
  const tokenAddressesKey = JSON.stringify(tokenAddresses);
  const subscribedTokenAddresses = useMemo<string[]>(
    () => JSON.parse(tokenAddressesKey),
    [tokenAddressesKey],
  );
  const subscriptionId = walletAddress
    ? `${chainId}:${walletAddress}:${tokenAddressesKey}`
    : undefined;
  const [activeSubscription, setActiveSubscription] = useState<{
    id: string;
    service: BalanceService;
  }>();
  const isSubscribed =
    activeSubscription?.id === subscriptionId && activeSubscription?.service === service;
  const balanceKey =
    walletAddress && isSubscribed
      ? (['token-balances', service, chainId, walletAddress] as const)
      : null;
  const { data, error, isLoading, mutate } = useSWR(
    balanceKey,
    ([, , currentChainId, currentWalletAddress]) =>
      service.fetchBalances({
        chainId: currentChainId,
        walletAddress: currentWalletAddress,
      }),
    { refreshInterval: BALANCE_REFRESH_INTERVAL },
  );
  useEffect(() => {
    if (!walletAddress || !subscriptionId || subscribedTokenAddresses.length === 0) {
      return;
    }

    const unsubscribe = service.subscribe({
      chainId,
      walletAddress,
      tokenAddresses: subscribedTokenAddresses,
    });
    setActiveSubscription({ id: subscriptionId, service });
    void mutateCache(['token-balances', service, chainId, walletAddress]);

    return () => {
      unsubscribe();
    };
  }, [chainId, mutateCache, service, subscribedTokenAddresses, subscriptionId, walletAddress]);

  return { data, error, isLoading, mutate };
}

export function useRefreshTokenBalances() {
  const service = useBalanceService();
  const { mutate } = useSWRConfig();

  return useCallback(
    ({ chainId, walletAddress }: { chainId: number; walletAddress: string }) =>
      mutate(
        (key) =>
          Array.isArray(key) &&
          key[0] === 'token-balances' &&
          key[1] === service &&
          key[2] === chainId &&
          key[3] === normalizeAddress(walletAddress),
      ),
    [mutate, service],
  );
}
