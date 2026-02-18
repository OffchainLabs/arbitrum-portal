import { BigNumber } from 'ethers';
import { useMemo } from 'react';
import useSWR from 'swr';
import { Address, PublicClient, getAddress } from 'viem';
import { useAccount, usePublicClient } from 'wagmi';

import { ChainId } from '@/bridge/types/ChainId';

// Standard ERC20 ABI for balanceOf function
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * SWR key generator for token balance cache
 */
function getTokenBalanceKey(
  walletAddress: string | undefined,
  tokenAddress: string | null,
  chainId: number,
): string[] | null {
  if (!walletAddress) return null;
  return ['token-balance', walletAddress.toLowerCase(), tokenAddress || 'ETH', String(chainId)];
}

/**
 * Fetcher function for token balances using wagmi
 */
async function fetchTokenBalance(
  key: string[],
  publicClient: PublicClient | undefined,
  walletAddress: string,
  tokenAddress: string | null,
): Promise<bigint> {
  if (!publicClient) {
    throw new Error('Public client not available');
  }

  if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
    // Fetch native ETH balance
    const balance = await publicClient.getBalance({
      address: walletAddress as Address,
    });
    return balance;
  } else {
    // Fetch ERC20 token balance
    const balance = await publicClient.readContract({
      address: getAddress(tokenAddress),
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as Address],
    });
    return balance as bigint;
  }
}

interface UseTokenBalanceParams {
  /** Token address (null for native ETH) */
  tokenAddress: string | null;
  /** Chain ID */
  chainId?: number;
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

/**
 * Common hook to fetch a single token balance using SWR
 * Key: ['token-balance', walletAddress, tokenAddress, chainId]
 *
 * This hook can be used across all action panels (Vault, Pendle, LiquidStaking)
 * to fetch onchain token balances for a wallet address on a specific chain.
 */
export function useTokenBalance({
  tokenAddress,
  chainId = ChainId.ArbitrumOne,
  enabled = true,
}: UseTokenBalanceParams): UseTokenBalanceResult {
  const { address: walletAddress, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId });

  const shouldFetch = enabled && !!walletAddress && isConnected;
  const swrKey = shouldFetch ? getTokenBalanceKey(walletAddress, tokenAddress, chainId) : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    async (key) => {
      if (!walletAddress || !publicClient) return null;
      return fetchTokenBalance(key, publicClient, walletAddress, tokenAddress);
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

/**
 * Helper function to invalidate all token balances for a wallet
 * Can be called after successful transactions
 */
export function invalidateTokenBalances(
  walletAddress: string,
  chainId: number = ChainId.ArbitrumOne,
) {
  // This will be used with SWR's mutate function
  // Usage: mutate(invalidateTokenBalances(walletAddress, chainId))
  return (key: string[] | null) => {
    if (!Array.isArray(key)) return false;
    return (
      key[0] === 'token-balance' &&
      key[1] === walletAddress.toLowerCase() &&
      key[3] === String(chainId)
    );
  };
}
