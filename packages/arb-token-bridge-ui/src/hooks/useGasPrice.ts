import { BigNumber, constants } from 'ethers';
import useSWR from 'swr';

import { getProviderForChainId } from '../token-bridge-sdk/utils';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';

export function useGasPrice({ chainId }: { chainId: number }): BigNumber {
  // Don't fetch an EVM gas price for other ecosystems
  const queryKey = getWalletEcosystem(chainId) === 'evm' ? (['gasPrice', chainId] as const) : null;

  const { data: gasPrice = constants.Zero } = useSWR(
    queryKey,
    ([, _chainId]) => getProviderForChainId(_chainId).getGasPrice(),
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000,
    },
  );

  return gasPrice;
}
