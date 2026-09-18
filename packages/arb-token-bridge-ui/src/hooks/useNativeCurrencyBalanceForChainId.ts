import { BigNumber } from 'ethers';

import { getWagmiChain } from '../util/wagmi/getWagmiChain';
import { getNativeTokenAddress } from '../wallet/constants';
import { useTokenBalances } from '../wallet/hooks/useTokenBalances';

export const useNativeCurrencyBalanceForChainId = (chainId: number, walletAddress?: string) => {
  const tokenAddress = getNativeTokenAddress(chainId);
  const result = useTokenBalances({ chainId, walletAddress, tokenAddresses: [tokenAddress] });
  const balance = result.data?.[tokenAddress];
  const { decimals, symbol } = getWagmiChain(chainId).nativeCurrency;
  return {
    ...result,
    data:
      balance === undefined ? undefined : { balance: BigNumber.from(balance), decimals, symbol },
  };
};
