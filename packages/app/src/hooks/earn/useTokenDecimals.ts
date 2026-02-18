import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';
import { getAddress } from 'viem';
import { usePublicClient } from 'wagmi';

import { defaultErc20Decimals } from '@/bridge/defaults';
import { ChainId } from '@/bridge/types/ChainId';

// Standard ERC20 ABI for decimals function
const ERC20_ABI = [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * SWR key generator for token decimals cache
 */
function getTokenDecimalsKey(tokenAddress: string | null, chainId: number): string[] | null {
  if (!tokenAddress) return null;
  return ['pendle-token-decimals', tokenAddress.toLowerCase(), String(chainId)];
}

/**
 * Fetcher function for token decimals using wagmi
 */
async function fetchTokenDecimals(
  key: string[],
  publicClient: any,
  tokenAddress: string | null,
): Promise<number> {
  if (!publicClient) {
    throw new Error('Public client not available');
  }

  // Native ETH has 18 decimals
  if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
    return 18;
  }

  try {
    // Fetch ERC20 token decimals
    const decimals = await publicClient.readContract({
      address: getAddress(tokenAddress),
      abi: ERC20_ABI,
      functionName: 'decimals',
    });
    return Number(decimals);
  } catch (error) {
    // If contract call fails, default to 18 decimals
    console.warn(`Failed to fetch decimals for token ${tokenAddress}, defaulting to 18`, error);
    return defaultErc20Decimals;
  }
}

interface UseTokenDecimalsParams {
  /** Token address (null for native ETH) */
  tokenAddress: string | null;
  /** Chain ID */
  chainId?: number;
  /** Whether to fetch decimals */
  enabled?: boolean;
}

interface UseTokenDecimalsResult {
  /** Token decimals */
  decimals: number;
  /** Whether decimals are loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Hook to fetch token decimals using SWR (immutable cache)
 * Key: ['pendle-token-decimals', tokenAddress, chainId]
 */
export function useTokenDecimals({
  tokenAddress,
  chainId = ChainId.ArbitrumOne,
  enabled = true,
}: UseTokenDecimalsParams): UseTokenDecimalsResult {
  const publicClient = usePublicClient({ chainId });

  const shouldFetch = enabled && !!tokenAddress;
  const swrKey = shouldFetch ? getTokenDecimalsKey(tokenAddress, chainId) : null;

  const { data, error, isLoading } = useSWRImmutable(
    swrKey,
    async (key) => {
      if (!tokenAddress || !publicClient) return defaultErc20Decimals;
      return fetchTokenDecimals(key, publicClient, tokenAddress);
    },
    {
      errorRetryCount: 2,
    },
  );

  const decimals = useMemo(() => {
    // Native ETH has 18 decimals
    if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
      return 18;
    }
    return data ?? defaultErc20Decimals;
  }, [data, tokenAddress]);

  return {
    decimals,
    isLoading,
    error: error?.message || null,
  };
}
