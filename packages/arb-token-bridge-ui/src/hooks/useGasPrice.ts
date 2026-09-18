import { BigNumber, constants } from 'ethers';
import useSWR from 'swr';

import { fetchGasPrice } from '../services/gasPrice';

export function useGasPrice({ chainId }: { chainId: number }): BigNumber {
  const { data = constants.Zero } = useSWR(
    ['gasPrice', chainId] as const,
    ([, id]) => fetchGasPrice(id),
    {
      refreshInterval: 30000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5000,
    },
  );
  return data;
}
