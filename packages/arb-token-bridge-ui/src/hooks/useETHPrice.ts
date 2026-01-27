import axios from 'axios';
import { constants } from 'ethers';
import { useCallback } from 'react';
import useSWR, { KeyedMutator } from 'swr';

import { ChainId } from '../types/ChainId';
import { getAPIBaseUrl } from '../util';
import { isLifiEnabled } from '../util/featureFlag';

export type UseETHPriceResult = {
  ethPrice: number;
  ethToUSD: (etherValue: number) => number;
  error?: Error;
  isValidating: boolean;
  mutate: KeyedMutator<any>;
};

export function useETHPrice(): UseETHPriceResult {
  const fetchCoinbaseEthPrice = () =>
    axios
      .get('https://api.coinbase.com/v2/prices/ETH-USD/spot')
      .then((res) => Number(res.data.data.amount));

  const fetchLifiEthPrice = async (): Promise<number | undefined> => {
    const url = `${getAPIBaseUrl()}/api/crosschain-transfers/lifi/tokens?parentChainId=${
      ChainId.Ethereum
    }&childChainId=${ChainId.ArbitrumOne}`;
    const { data } = await axios.get(url);
    const tokens: {
      address: string;
      extensions?: {
        priceUSD?: string | number;
      };
    }[] = data?.tokens ?? [];
    const ethToken = tokens.find((token) => token.address === constants.AddressZero);
    const priceUSD = ethToken?.extensions?.priceUSD;
    if (!priceUSD) return undefined;
    const parsed = Number(priceUSD);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const { data, error, isValidating, mutate } = useSWR<number, Error>(
    'eth-price',
    async () => {
      if (isLifiEnabled()) {
        try {
          const lifiPrice = await fetchLifiEthPrice();
          if (typeof lifiPrice === 'number') {
            return lifiPrice;
          }
        } catch {
          // Fall back to Coinbase if LiFi price fetch fails
        }
      }

      return fetchCoinbaseEthPrice();
    },
    {
      refreshInterval: 300_000, // 5 minutes
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3_000,
    },
  );

  const ethToUSD = useCallback(
    (etherValue: number) => {
      const safeETHPrice = data && !isNaN(data) ? Number(data) : 0;
      return etherValue * safeETHPrice;
    },
    [data],
  );

  return { ethPrice: data ?? 0, ethToUSD, error, isValidating, mutate };
}
