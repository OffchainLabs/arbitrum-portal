import type { BigNumber } from 'ethers';
import useSWR from 'swr';

import { getProviderForChainId } from '../token-bridge-sdk/utils';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';

export function useGasPrice({ chainId }: { chainId: number }): BigNumber | undefined {
  const { data } = useSWR(
    getWalletEcosystem(chainId) === 'evm' ? (['gasPrice', chainId] as const) : null,
    ([, id]) => getProviderForChainId(id).getGasPrice(),
    {
      refreshInterval: 30000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5000,
    },
  );
  return data;
}
