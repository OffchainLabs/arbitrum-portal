import useSWRImmutable from 'swr/immutable';

import { AccountType, getAccountType } from '../util/AccountUtils';
import { findAddressEcosystem } from '../util/AddressUtils';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import { useWallets } from '../wallet/hooks/useWallets';
import { useNetworks } from './useNetworks';

type Result = {
  accountType: AccountType | undefined;
  isLoading: boolean;
};

export function useAccountType(addressOverride?: string, chainIdOverride?: number): Result {
  const {
    sourceWallet: {
      account: { address: walletAddress },
    },
  } = useWallets();
  const [{ sourceChain, destinationChain }] = useNetworks();

  const address = addressOverride ?? walletAddress;
  // By default we resolve account type against the route chain of the address's ecosystem,
  // so an EVM address is checked on the EVM side of a Solana route.
  // Callers can override the chain when they need to inspect a specific connected chain instead.
  const addressEcosystem = findAddressEcosystem(address);
  const chainId =
    chainIdOverride ??
    [sourceChain?.id, destinationChain?.id].find(
      (id) => typeof id !== 'undefined' && getWalletEcosystem(id) === addressEcosystem,
    );

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
