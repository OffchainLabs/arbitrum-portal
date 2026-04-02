import useSWR from 'swr';

import { useBalance } from './useBalance';

type UseTokenBalancesProps = {
  chainId: number;
  walletAddress?: string;
  tokenAddresses: string[];
};

export function useTokenBalances({
  chainId,
  walletAddress,
  tokenAddresses,
}: UseTokenBalancesProps) {
  const { fetchBalance } = useBalance({ chainId });

  const { data, error, isLoading } = useSWR(
    walletAddress ? ['token-balances', chainId, walletAddress, ...tokenAddresses] : null,
    ([, , keyWalletAddress, ...keyTokenAddresses]) =>
      fetchBalance({
        walletAddress: keyWalletAddress,
        tokenAddresses: keyTokenAddresses,
      }),
  );

  return {
    data,
    error,
    isLoading,
  };
}
