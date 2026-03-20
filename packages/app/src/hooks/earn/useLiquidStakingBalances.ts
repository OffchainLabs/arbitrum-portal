'use client';

import { BigNumber, constants } from 'ethers';
import { useMemo } from 'react';
import { Address, getAddress } from 'viem';
import { useAccount, useBalance } from 'wagmi';

import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';
import type { EarnChainId } from '@/earn-api/types';

interface UseTokenBalanceParams {
  /** Token address (null for native ETH) */
  tokenAddress: string | null;
  /** Chain ID */
  chainId?: EarnChainId;
}

interface UseTokenBalanceResult {
  /** Balance as BigNumber (ethers) */
  balance: BigNumber | null;
  /** Whether balance is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Function to manually refetch balance */
  refetch: () => void;
}

export function useTokenBalance({
  tokenAddress,
  chainId = ChainId.ArbitrumOne,
}: UseTokenBalanceParams): UseTokenBalanceResult {
  const { address: walletAddress, isConnected } = useAccount();
  const shouldFetch = isConnected && !!walletAddress;
  const normalizedTokenAddress = useMemo(() => {
    if (!tokenAddress || tokenAddress === constants.AddressZero) {
      return undefined;
    }
    return getAddress(tokenAddress) as Address;
  }, [tokenAddress]);
  const { data, error, isLoading, refetch } = useBalance({
    address: walletAddress,
    chainId,
    token: normalizedTokenAddress,
    query: {
      enabled: shouldFetch,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 15_000,
    },
  });

  const balance = useMemo(() => {
    if (!data) return null;
    return BigNumber.from(data.value.toString());
  }, [data]);

  return {
    balance,
    isLoading,
    error: error?.message || null,
    refetch: () => {
      void refetch();
    },
  };
}

export function useETHBalance() {
  return useTokenBalance({
    tokenAddress: null,
  });
}

export function useWstETHBalance() {
  return useTokenBalance({
    tokenAddress: CommonAddress.ArbitrumOne.WSTETH,
  });
}

export function useWeETHBalance() {
  return useTokenBalance({
    tokenAddress: CommonAddress.ArbitrumOne.WEETH,
  });
}
