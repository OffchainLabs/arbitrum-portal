'use client';

import { constants } from 'ethers';
import { useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';

import { useETHPrice } from '@/bridge/hooks/useETHPrice';
import { ChainId } from '@/bridge/types/ChainId';
import { addressesEqual } from '@/bridge/util/AddressUtils';
import { type EarnChainId, OpportunityCategory } from '@/earn-api/types';

import { useAllOpportunities } from './useAllOpportunities';
import { useUserPositions } from './useUserPositions';

type AssetDescriptor = {
  chainId: number;
  tokenAddress?: string | null;
};

type SymbolDescriptor = {
  chainId: number;
  symbol?: string | null;
};

function makeAddressKey(chainId: number, tokenAddress: string): string {
  return `${chainId}:${tokenAddress.toLowerCase()}`;
}

function makeSymbolKey(chainId: number, symbol: string): string {
  return `${chainId}:${symbol.toUpperCase()}`;
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
  /** Latest USD price for `(chainId, symbol)`. Used where addresses aren't on hand
   * (e.g. transaction history rows). Handles Pendle's "PT"+underlying convention. */
  getPriceBySymbol: (asset: SymbolDescriptor) => number | null;
  isLoading: boolean;
}

/**
 * USD price snapshot for any asset surfaced by Earn opportunities or positions.
 * Pure derivation — no extra fetch. Use for input × price previews, balance USD
 * lines, and TX history USD math. Native ETH is handled by `useEarnTokenPrice`.
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

  const { priceByAddress, priceBySymbol } = useMemo(() => {
    const byAddress = new Map<string, number>();
    const bySymbol = new Map<string, number>();

    for (const row of opportunities) {
      if (row.underlyingTokenAddress && isPositiveFiniteNumber(row.underlyingTokenPriceUsd)) {
        byAddress.set(
          makeAddressKey(row.chainId, row.underlyingTokenAddress),
          row.underlyingTokenPriceUsd,
        );
      }
      if (row.shareTokenAddress && isPositiveFiniteNumber(row.shareTokenPriceUsd)) {
        byAddress.set(makeAddressKey(row.chainId, row.shareTokenAddress), row.shareTokenPriceUsd);
      }
      if (row.token && isPositiveFiniteNumber(row.underlyingTokenPriceUsd)) {
        bySymbol.set(makeSymbolKey(row.chainId, row.token), row.underlyingTokenPriceUsd);
      }
      // Pendle's tx history uses the "PT"+underlying convention as the row symbol.
      if (
        row.category === OpportunityCategory.FixedYield &&
        row.token &&
        isPositiveFiniteNumber(row.shareTokenPriceUsd)
      ) {
        bySymbol.set(makeSymbolKey(row.chainId, `PT${row.token}`), row.shareTokenPriceUsd);
      }
    }

    for (const position of positionsMap.values()) {
      if (!position.tokenAddress || !isPositiveFiniteNumber(position.tokenPriceUsd)) continue;
      const key = makeAddressKey(chainId, position.tokenAddress);
      // Don't overwrite a richer opportunity-derived price.
      if (!byAddress.has(key)) {
        byAddress.set(key, position.tokenPriceUsd);
      }
    }

    return { priceByAddress: byAddress, priceBySymbol: bySymbol };
  }, [opportunities, positionsMap, chainId]);

  const getPrice = useCallback(
    (asset: AssetDescriptor) => {
      if (!asset.tokenAddress) return null;
      return priceByAddress.get(makeAddressKey(asset.chainId, asset.tokenAddress)) ?? null;
    },
    [priceByAddress],
  );

  const getPriceBySymbol = useCallback(
    (asset: SymbolDescriptor) => {
      if (!asset.symbol) return null;
      return priceBySymbol.get(makeSymbolKey(asset.chainId, asset.symbol)) ?? null;
    },
    [priceBySymbol],
  );

  return {
    getPrice,
    getPriceBySymbol,
    isLoading: opportunitiesLoading || positionsLoading,
  };
}

/**
 * One-shot price lookup for a single `(chainId, tokenAddress)`. Resolves the
 * connected wallet so position-derived prices flow in automatically, and falls
 * back to the bridge-side ETH price (LiFi → Coinbase) for native ETH inputs.
 */
export function useEarnTokenPrice(asset: {
  chainId: EarnChainId;
  tokenAddress?: string | null;
}): number | null {
  const { address } = useAccount();
  const { getPrice } = useEarnPrices({ chainId: asset.chainId, userAddress: address ?? null });
  const { ethPrice } = useETHPrice();
  if (asset.tokenAddress && isNativeEth(asset.tokenAddress)) {
    return isPositiveFiniteNumber(ethPrice) ? ethPrice : null;
  }
  return getPrice(asset);
}
