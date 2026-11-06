import { BigNumber } from 'ethers';

import { getChainMetadata } from '../util/networkMetadata';
import { getNativeTokenAddress } from '../wallet/ecosystems/getEcosystemConfig';
import { useTokenBalances } from '../wallet/hooks/useTokenBalances';

export const useNativeCurrencyBalanceForChainId = (chainId: number, walletAddress?: string) => {
  const tokenAddress = getNativeTokenAddress(chainId);
  const result = useTokenBalances({
    chainId,
    walletAddress,
    tokenAddresses: [tokenAddress],
    refreshInterval: 30_000,
    revalidateOnFocus: false,
    errorRetryCount: 2,
    errorRetryInterval: 3_000,
  });
  const balance = result.data?.[tokenAddress];
  const { decimals, symbol } = getChainMetadata(chainId).nativeCurrency;
  return {
    ...result,
    data:
      balance === undefined ? undefined : { balance: BigNumber.from(balance), decimals, symbol },
  };
};
