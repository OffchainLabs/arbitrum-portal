'use client';

import useSWR from 'swr';

import { ChainId } from '@/bridge/types/ChainId';

const LIQUID_STAKING_PRICE_KEY = 'earn-liquid-staking-prices';
const PRICE_REFRESH_INTERVAL_MS = 300_000;

type LiquidStakingPrices = Record<string, number>;

type LifiTokenListResponse = {
  tokens?: Array<{
    address: string;
    priceUSD?: string | number;
    extensions?: {
      priceUSD?: string | number;
    };
  }>;
};

async function fetchLiquidStakingPrices(): Promise<LiquidStakingPrices> {
  const response = await fetch(
    `/api/crosschain-transfers/lifi/tokens?parentChainId=${ChainId.Ethereum}&childChainId=${ChainId.ArbitrumOne}`,
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch liquid staking prices (${response.status} ${response.statusText})`,
    );
  }

  const payload = (await response.json()) as LifiTokenListResponse;
  const prices: LiquidStakingPrices = {};

  for (const token of payload.tokens ?? []) {
    const price = Number(token.extensions?.priceUSD ?? token.priceUSD);
    if (!Number.isFinite(price) || price <= 0) {
      continue;
    }

    prices[token.address.toLowerCase()] = price;
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

  const { data, isLoading, error } = useSWR<LiquidStakingPrices>(
    normalizedTokenAddress ? LIQUID_STAKING_PRICE_KEY : null,
    fetchLiquidStakingPrices,
    {
      refreshInterval: PRICE_REFRESH_INTERVAL_MS,
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
