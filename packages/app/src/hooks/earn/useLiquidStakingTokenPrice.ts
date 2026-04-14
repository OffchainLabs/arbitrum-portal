'use client';

import useSWR from 'swr';

import { ChainId } from '@/bridge/types/ChainId';

type LifiTokenListResponse = {
  tokens?: Array<{
    address: string;
    priceUSD?: string | number;
    extensions?: {
      priceUSD?: string | number;
    };
  }>;
};

async function fetchLiquidStakingPrices() {
  const response = await fetch(
    `/api/crosschain-transfers/lifi/tokens?parentChainId=${ChainId.Ethereum}&childChainId=${ChainId.ArbitrumOne}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch token prices (${response.status} ${response.statusText})`);
  }

  const payload = (await response.json()) as LifiTokenListResponse;
  const prices: Record<string, number> = {};

  for (const token of payload.tokens ?? []) {
    const price = Number(token.extensions?.priceUSD ?? token.priceUSD);
    if (!Number.isNaN(price) && price > 0) {
      prices[token.address.toLowerCase()] = price;
    }
  }

  return prices;
}

interface UseLiquidStakingTokenPriceResult {
  priceUsd: number | null;
  isLoading: boolean;
  error: string | null;
}

export function useLiquidStakingTokenPrice(
  tokenAddress: string | undefined,
): UseLiquidStakingTokenPriceResult {
  const normalizedTokenAddress = tokenAddress?.toLowerCase();

  const { data, isLoading, error } = useSWR(
    normalizedTokenAddress ? 'earn-liquid-staking-prices' : null,
    fetchLiquidStakingPrices,
    {
      refreshInterval: 300_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      shouldRetryOnError: true,
      errorRetryCount: 2,
    },
  );

  return {
    priceUsd: normalizedTokenAddress ? (data?.[normalizedTokenAddress] ?? null) : null,
    isLoading,
    error: error?.message ?? null,
  };
}
