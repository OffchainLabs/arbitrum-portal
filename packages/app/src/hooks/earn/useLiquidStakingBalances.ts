'use client';

import { BigNumber, constants } from 'ethers';
import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';
import { Address, PublicClient, getAddress } from 'viem';
import { useAccount, usePublicClient } from 'wagmi';

import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';
import { ERC20_BALANCE_ABI } from '@/earn-api/lib/erc20Abi';
import type { EarnChainId } from '@/earn-api/types';

async function fetchTokenBalance(
  publicClient: PublicClient | undefined,
  walletAddress: string,
  tokenAddress: string | null,
): Promise<bigint> {
  if (!publicClient) {
    throw new Error('Public client not available');
  }

  if (!tokenAddress || tokenAddress === constants.AddressZero) {
    const balance = await publicClient.getBalance({
      address: walletAddress as Address,
    });
    return balance;
  }

  const balance = await publicClient.readContract({
    address: getAddress(tokenAddress),
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: [walletAddress as Address],
  });
  return balance as bigint;
}

interface UseTokenBalanceParams {
  /** Token address (null for native ETH) */
  tokenAddress: string | null;
  /** Chain ID */
  chainId?: EarnChainId;
  /** Whether to fetch balance */
  enabled?: boolean;
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
  enabled = true,
}: UseTokenBalanceParams): UseTokenBalanceResult {
  const { address: walletAddress, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId });

  const shouldFetch = enabled && !!walletAddress && isConnected;
  const swrKey = shouldFetch
    ? ([
        'liquid-staking-balance',
        walletAddress.toLowerCase(),
        tokenAddress?.toLowerCase() || 'ETH',
        String(chainId),
      ] as const)
    : null;

  const { data, error, isLoading, mutate } = useSWRImmutable(
    swrKey,
    async () => {
      if (!walletAddress || !publicClient) return null;
      return fetchTokenBalance(publicClient, walletAddress, tokenAddress);
    },
    {
      errorRetryCount: 2,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const balance = useMemo(() => {
    if (!data) return null;
    return BigNumber.from(data.toString());
  }, [data]);

  return {
    balance,
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
  };
}

export function invalidateLiquidStakingBalances(
  walletAddress: string,
  chainId: EarnChainId = ChainId.ArbitrumOne,
) {
  return (key: string[] | null) => {
    if (!Array.isArray(key)) return false;
    return (
      key[0] === 'liquid-staking-balance' &&
      key[1] === walletAddress.toLowerCase() &&
      key[3] === String(chainId)
    );
  };
}

export function useETHBalance(enabled: boolean = true) {
  return useTokenBalance({
    tokenAddress: null,
    enabled,
  });
}

export function useWstETHBalance(enabled: boolean = true) {
  return useTokenBalance({
    tokenAddress: CommonAddress.ArbitrumOne.WSTETH,
    enabled,
  });
}

export function useWeETHBalance(enabled: boolean = true) {
  return useTokenBalance({
    tokenAddress: CommonAddress.ArbitrumOne.WEETH,
    enabled,
  });
}
