'use client';

import { constants } from 'ethers';
import { useMemo } from 'react';

import { useETHPrice } from '@/bridge/hooks/useETHPrice';
import { ChainId } from '@/bridge/types/ChainId';
import { addressesEqual } from '@/bridge/util/AddressUtils';
import { type EarnChainId } from '@/earn-api/types';

import { useAllOpportunities } from './useAllOpportunities';
import { useUserPositions } from './useUserPositions';

type AssetDescriptor = {
  chainId: number;
  tokenAddress?: string | null;
};

function makeKey(chainId: number, tokenAddress: string): string {
  return `${chainId}:${tokenAddress.toLowerCase()}`;
}

function isPositiveFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNativeEth(tokenAddress: string): boolean {
  return addressesEqual(tokenAddress, constants.AddressZero);
}

export interface UseEarnPricesResult {
  /** Latest USD price for `(chainId, tokenAddress)`. Null if not yet known. */
  getPrice: (asset: AssetDescriptor) => number | null;
  isLoading: boolean;
}

/**
 * USD price snapshot for any asset surfaced by Earn opportunities or positions.
 * Pure derivation — no extra fetch. Use for input × price previews, balance USD
 * lines, and TX history USD math.
 */
export function useEarnPrices(params?: {
  userAddress?: string | null;
  chainId?: EarnChainId;
}): UseEarnPricesResult {
  const chainId = params?.chainId ?? ChainId.ArbitrumOne;
  const { opportunities, isLoading: opportunitiesLoading } = useAllOpportunities({ chainId });
  const { positionsMap, isLoading: positionsLoading } = useUserPositions(params?.userAddress, [
    chainId,
  ]);
  // Native ETH is not in the Earn catalog — but it's a common LST swap source.
  // Use the bridge-side useETHPrice (LiFi → Coinbase fallback) to fill that gap.
  const { ethPrice } = useETHPrice();

  const priceMap = useMemo(() => {
    const map = new Map<string, number>();

    for (const row of opportunities) {
      if (row.underlyingTokenAddress && isPositiveFiniteNumber(row.underlyingTokenPriceUsd)) {
        map.set(makeKey(row.chainId, row.underlyingTokenAddress), row.underlyingTokenPriceUsd);
      }
      if (row.shareTokenAddress && isPositiveFiniteNumber(row.shareTokenPriceUsd)) {
        map.set(makeKey(row.chainId, row.shareTokenAddress), row.shareTokenPriceUsd);
      }
    }

    for (const position of positionsMap.values()) {
      if (!position.tokenAddress || !isPositiveFiniteNumber(position.tokenPriceUsd)) continue;
      const key = makeKey(chainId, position.tokenAddress);
      // Don't overwrite a richer opportunity-derived price.
      if (!map.has(key)) {
        map.set(key, position.tokenPriceUsd);
      }
    }

    return map;
  }, [opportunities, positionsMap, chainId]);

  return {
    getPrice: (asset) => {
      if (!asset.tokenAddress) return null;
      if (isNativeEth(asset.tokenAddress)) {
        return isPositiveFiniteNumber(ethPrice) ? ethPrice : null;
      }
      return priceMap.get(makeKey(asset.chainId, asset.tokenAddress)) ?? null;
    },
    isLoading: opportunitiesLoading || positionsLoading,
  };
}
