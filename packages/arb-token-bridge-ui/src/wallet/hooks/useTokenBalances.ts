import { useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { addressesEqual } from '../../util/AddressUtils';
import { fetchBalances } from '../balance/fetchBalances';

const BALANCE_REFRESH_INTERVAL = 15_000;

export function useTokenBalances({
  chainId,
  walletAddress,
  tokenAddresses,
}: {
  chainId: number;
  walletAddress?: string;
  tokenAddresses: string[];
}) {
  return useSWR(
    walletAddress && tokenAddresses.length > 0
      ? ([chainId, walletAddress, tokenAddresses, 'token-balances'] as const)
      : null,
    ([currentChainId, currentWalletAddress, currentTokenAddresses]) =>
      fetchBalances({
        chainId: currentChainId,
        walletAddress: currentWalletAddress,
        tokenAddresses: currentTokenAddresses,
      }),
    { refreshInterval: BALANCE_REFRESH_INTERVAL },
  );
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
