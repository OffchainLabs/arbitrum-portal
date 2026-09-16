import useSWR from 'swr';

import { useBalance } from './useBalance';

export function useTokenBalances({
  chainId,
  walletAddress,
  tokenAddresses,
}: {
  chainId: number;
  walletAddress?: string;
  tokenAddresses: string[];
}) {
  const { fetchBalance } = useBalance({ chainId });
  const { data, error, isLoading, mutate } = useSWR(
    walletAddress ? ['token-balances', chainId, walletAddress, ...tokenAddresses] : null,
    ([, , currentWalletAddress, ...currentTokenAddresses]) =>
      fetchBalance({
        walletAddress: currentWalletAddress,
        tokenAddresses: currentTokenAddresses,
      }),
  );

  return { data, error, isLoading, mutate };
}
