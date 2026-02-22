'use client';

import { BigNumber } from 'ethers';
import { useMemo } from 'react';
import { type Address, getAddress } from 'viem';
import { useAccount, useBalance } from 'wagmi';

import { ChainId } from '@/bridge/types/ChainId';

interface UseTokenBalanceParams {
  tokenAddress: string | null;
  chainId?: number;
  enabled?: boolean;
}

interface UseTokenBalanceResult {
  balance: BigNumber | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function normalizeTokenAddress(tokenAddress: string | null): Address | undefined {
  if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
    return undefined;
  }

  try {
    return getAddress(tokenAddress);
  } catch {
    return undefined;
  }
}

/**
 * Fetch a native/ERC20 balance for the connected wallet on a given chain.
 * Uses wagmi's shared balance query instead of a custom SWR balance layer.
 */
export function useTokenBalance({
  tokenAddress,
  chainId = ChainId.ArbitrumOne,
  enabled = true,
}: UseTokenBalanceParams): UseTokenBalanceResult {
  const { address: walletAddress, isConnected } = useAccount();
  const normalizedTokenAddress = useMemo(() => normalizeTokenAddress(tokenAddress), [tokenAddress]);

  const isNativeBalanceRequest =
    !tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000';
  const hasValidTokenAddress = isNativeBalanceRequest || !!normalizedTokenAddress;
  const shouldFetch = enabled && isConnected && !!walletAddress && hasValidTokenAddress;

  const { data, error, isLoading, refetch } = useBalance({
    address: shouldFetch ? walletAddress : undefined,
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
    if (!data) {
      return null;
    }
    return BigNumber.from(data.value.toString());
  }, [data]);

  return {
    balance,
    isLoading,
    error: error?.message ?? null,
    refetch: () => {
      void refetch();
    },
  };
}
