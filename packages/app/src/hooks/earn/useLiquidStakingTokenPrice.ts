'use client';

import useSWRImmutable from 'swr/immutable';

import { useETHPrice } from '@/bridge/hooks/useETHPrice';

const WSTETH_PRICE_KEY = 'earn-wsteth-usd-price';

async function fetchWstEthPriceUsd(): Promise<number> {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=wrapped-steth&vs_currencies=usd',
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch wstETH USD price (${response.status} ${response.statusText})`);
  }

  const payload = (await response.json()) as {
    ['wrapped-steth']?: {
      usd?: number;
    };
  };

  const price = Number(payload['wrapped-steth']?.usd);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Invalid wstETH USD price response');
  }

  return price;
}

interface UseLiquidStakingTokenPriceResult {
  priceUsd: number | null;
  isLoading: boolean;
  error: string | null;
}

export function useLiquidStakingTokenPrice(
  tokenSymbol: string | undefined,
): UseLiquidStakingTokenPriceResult {
  const normalizedSymbol = tokenSymbol?.toLowerCase();
  const isWstEth = normalizedSymbol === 'wsteth';

  const { ethPrice, isValidating: isEthPriceLoading, error: ethPriceError } = useETHPrice();

  const {
    data: wstEthPrice,
    isLoading: isWstEthPriceLoading,
    error: wstEthPriceError,
  } = useSWRImmutable<number>(isWstEth ? WSTETH_PRICE_KEY : null, fetchWstEthPriceUsd, {
    errorRetryCount: 1,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  if (isWstEth) {
    return {
      priceUsd: wstEthPrice ?? null,
      isLoading: isWstEthPriceLoading,
      error: wstEthPriceError?.message ?? null,
    };
  }

  return {
    priceUsd: ethPrice > 0 ? ethPrice : null,
    isLoading: isEthPriceLoading,
    error: ethPriceError?.message ?? null,
  };
}
