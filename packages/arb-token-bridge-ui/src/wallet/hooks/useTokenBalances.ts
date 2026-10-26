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
}: {
  chainId: number;
  walletAddress?: string;
  tokenAddresses: string[];
  refreshInterval?: number;
  keepPreviousData?: boolean;
}) {
  const key =
    walletAddress && isValidAddressForChain(walletAddress, chainId) && tokenAddresses.length > 0
      ? ([chainId, walletAddress, tokenAddresses, 'token-balances'] as const)
      : null;
  const result = useSWR(
    key,
    async ([currentChainId, currentWalletAddress, currentTokenAddresses]) => ({
      chainId: currentChainId,
      walletAddress: currentWalletAddress,
      balances: await fetchBalances({
        chainId: currentChainId,
        walletAddress: currentWalletAddress,
        tokenAddresses: currentTokenAddresses,
      }),
    }),
    {
      refreshInterval,
      revalidateOnFocus: refreshInterval > 0,
      keepPreviousData,
    },
  );

  // `keepPreviousData` returns the previous key's balances while the next key loads, and keeps them
  // if it fails. Only a token list change should reuse them, not a disconnect or another wallet or chain.
  const isCurrentWallet =
    !!key && result.data?.chainId === chainId && result.data.walletAddress === walletAddress;
  return { ...result, data: isCurrentWallet ? result.data?.balances : undefined };
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
