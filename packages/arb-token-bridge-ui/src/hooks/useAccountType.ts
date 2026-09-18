import useSWRImmutable from 'swr/immutable';

import { AccountType, getAccountType } from '../util/AccountUtils';
import { useWalletAddressForChain } from '../wallet/hooks/useWallets';
import { useNetworks } from './useNetworks';

type Result = {
  accountType: AccountType | undefined;
  isLoading: boolean;
};

export function useAccountType(addressOverride?: string, chainIdOverride?: number): Result {
  const [{ sourceChain }] = useNetworks();

  // By default we resolve account type against the bridge source chain.
  // Callers can override the chain when they need to inspect a specific connected chain instead.
  const chainId = chainIdOverride ?? sourceChain.id;
  const walletAddress = useWalletAddressForChain(chainId);
  const address = addressOverride ?? walletAddress;

  const { data: accountType, isLoading } = useSWRImmutable(
    address && chainId ? [address, chainId, 'useAccountType'] : null,
    ([_address, currentChainId]) => getAccountType({ address: _address, chainId: currentChainId }),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000,
    },
  );

  return {
    accountType,
    isLoading,
  };
}
