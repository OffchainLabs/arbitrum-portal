import { useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { addressesEqual, isValidAddressForChain } from '../../util/AddressUtils';
import { fetchBalances } from '../balance/fetchBalances';

const BALANCE_REFRESH_INTERVAL = 15_000;

export function useTokenBalances({
  chainId,
  walletAddress,
  tokenAddresses,
  refreshInterval = BALANCE_REFRESH_INTERVAL,
  keepPreviousData = false,
  revalidateOnFocus = refreshInterval > 0,
  errorRetryCount,
  errorRetryInterval,
}: {
  chainId: number;
  walletAddress?: string;
  tokenAddresses: string[];
  refreshInterval?: number;
  keepPreviousData?: boolean;
  revalidateOnFocus?: boolean;
  errorRetryCount?: number;
  errorRetryInterval?: number;
}) {
  const key =
    walletAddress && isValidAddressForChain(walletAddress, chainId) && tokenAddresses.length > 0
      ? ([chainId, walletAddress, tokenAddresses, 'token-balances'] as const)
      : null;
  const result = useSWR(
    key,
    ([currentChainId, currentWalletAddress, currentTokenAddresses]) =>
      fetchBalances({
        chainId: currentChainId,
        walletAddress: currentWalletAddress,
        tokenAddresses: currentTokenAddresses,
      }),
    {
      refreshInterval,
      revalidateOnFocus,
      keepPreviousData,
      errorRetryCount,
      errorRetryInterval,
    },
  );

  // `keepPreviousData` would keep returning the last balances after the wallet disconnects
  return key ? result : { ...result, data: undefined };
}

export function useRefreshTokenBalances() {
  const { mutate } = useSWRConfig();

  return useCallback(
    ({ chainId, walletAddress }: { chainId: number; walletAddress: string }) =>
      mutate(
        (key) =>
          Array.isArray(key) &&
          key[0] === chainId &&
          typeof key[1] === 'string' &&
          addressesEqual(key[1], walletAddress) &&
          key[3] === 'token-balances',
      ),
    [mutate],
  );
}
