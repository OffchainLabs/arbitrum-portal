import { MultiCaller } from '@arbitrum/sdk';
import { constants, utils } from 'ethers';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { zeroAddress } from 'viem';

import { getProviderForChainId } from '../../token-bridge-sdk/utils';
import { addressesEqual } from '../../util/AddressUtils';
import type { BalanceHandle, FetchBalanceInput, FetchBalanceResult } from '../types';

export const defaultEvmBalanceContextValue: BalanceHandle = {
  ecosystem: 'evm',
  fetchBalance: async () => {
    throw new Error('EVM balance provider is not available.');
  },
};

export const EvmBalanceContext = createContext<BalanceHandle>(defaultEvmBalanceContextValue);

export function useEvmBalanceContext() {
  return useContext(EvmBalanceContext);
}

export function EvmBalanceProvider({ children }: PropsWithChildren) {
  const fetchBalance = useCallback(
    async ({
      chainId,
      walletAddress,
      tokenAddresses,
    }: FetchBalanceInput): Promise<FetchBalanceResult> => {
      if (!utils.isAddress(walletAddress)) {
        throw new Error('Invalid EVM wallet address.');
      }

      const provider = getProviderForChainId(chainId);
      const balances = tokenAddresses.reduce<FetchBalanceResult>((acc, tokenAddress) => {
        acc[tokenAddress] = constants.Zero;
        return acc;
      }, {});

      const nativeTokenAddresses = tokenAddresses.filter((tokenAddress) =>
        addressesEqual(tokenAddress, zeroAddress),
      );
      const erc20TokenAddresses = tokenAddresses.filter(
        (tokenAddress) => !addressesEqual(tokenAddress, zeroAddress),
      );

      const [nativeBalance, tokenData] = await Promise.all([
        nativeTokenAddresses.length > 0
          ? provider.getBalance(walletAddress)
          : Promise.resolve(null),
        erc20TokenAddresses.length > 0
          ? MultiCaller.fromProvider(provider).then((multiCaller) =>
              multiCaller.getTokenData(erc20TokenAddresses, {
                balanceOf: { account: walletAddress },
              }),
            )
          : Promise.resolve(null),
      ]);

      if (nativeBalance) {
        nativeTokenAddresses.forEach((tokenAddress) => {
          balances[tokenAddress] = nativeBalance;
        });
      }

      if (tokenData) {
        erc20TokenAddresses.forEach((tokenAddress, index) => {
          balances[tokenAddress] = tokenData[index]?.balance ?? constants.Zero;
        });
      }

      return balances;
    },
    [],
  );

  const value = useMemo<BalanceHandle>(
    () => ({
      ecosystem: 'evm',
      fetchBalance,
    }),
    [fetchBalance],
  );

  return <EvmBalanceContext.Provider value={value}>{children}</EvmBalanceContext.Provider>;
}
