'use client';

import { useETHPrice } from '@/bridge/hooks/useETHPrice';

interface UseLiquidStakingTokenPriceResult {
  priceUsd: number | null;
  isLoading: boolean;
  error: string | null;
}

export function useLiquidStakingTokenPrice(
  _tokenSymbol: string | undefined,
): UseLiquidStakingTokenPriceResult {
  void _tokenSymbol;
  const { ethPrice, isValidating: isEthPriceLoading, error: ethPriceError } = useETHPrice();

  return {
    priceUsd: ethPrice > 0 ? ethPrice : null,
    isLoading: isEthPriceLoading,
    error: ethPriceError?.message ?? null,
  };
}
