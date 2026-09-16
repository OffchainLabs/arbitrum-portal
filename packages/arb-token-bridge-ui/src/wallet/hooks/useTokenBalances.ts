import { useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { addressesEqual } from '../../util/AddressUtils';
import { useBalanceService } from '../balance/BalanceContext';

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
  const service = useBalanceService();
  return useSWR(
    walletAddress && tokenAddresses.length > 0
      ? ([chainId, walletAddress, tokenAddresses, service, 'token-balances'] as const)
      : null,
    ([currentChainId, currentWalletAddress, currentTokenAddresses, currentService]) =>
      currentService.fetchBalances({
        chainId: currentChainId,
        walletAddress: currentWalletAddress,
        tokenAddresses: currentTokenAddresses,
      }),
    { refreshInterval: BALANCE_REFRESH_INTERVAL },
  );
}

export function useRefreshTokenBalances() {
  const service = useBalanceService();
  const { mutate } = useSWRConfig();

  return useCallback(
    ({ chainId, walletAddress }: { chainId: number; walletAddress: string }) =>
      mutate(
        (key) =>
          Array.isArray(key) &&
          key[0] === chainId &&
          typeof key[1] === 'string' &&
          addressesEqual(key[1], walletAddress) &&
          key[3] === service &&
          key[4] === 'token-balances',
      ),
    [mutate, service],
  );
}
