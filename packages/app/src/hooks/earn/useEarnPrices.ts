'use client';

import { constants } from 'ethers';
import { useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';

import { parseFiniteNumber } from '@/app-lib/earn/utils';
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

function isNativeEth(tokenAddress: string): boolean {
  return addressesEqual(tokenAddress, constants.AddressZero);
}

export interface UseEarnPricesResult {
  getPrice: (asset: AssetDescriptor) => number | null;
  getPriceBySymbol: (asset: SymbolDescriptor) => number | null;
  isLoading: boolean;
}

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
      const underlyingPrice = parseFiniteNumber(row.underlyingTokenPriceUsd, { min: 0 });
      const sharePrice = parseFiniteNumber(row.shareTokenPriceUsd, { min: 0 });

      if (row.underlyingTokenAddress && underlyingPrice) {
        byAddress.set(makeAddressKey(row.chainId, row.underlyingTokenAddress), underlyingPrice);
      }
      if (row.shareTokenAddress && sharePrice) {
        byAddress.set(makeAddressKey(row.chainId, row.shareTokenAddress), sharePrice);
      }
      if (row.token && underlyingPrice) {
        bySymbol.set(makeSymbolKey(row.chainId, row.token), underlyingPrice);
      }
      // Pendle's tx history uses the "PT"+underlying convention as the row symbol.
      if (row.category === OpportunityCategory.FixedYield && row.token && sharePrice) {
        bySymbol.set(makeSymbolKey(row.chainId, `PT${row.token}`), sharePrice);
      }
    }

    for (const position of positionsMap.values()) {
      const positionPrice = parseFiniteNumber(position.tokenPriceUsd, { min: 0 });
      if (!position.tokenAddress || !positionPrice) continue;
      const key = makeAddressKey(chainId, position.tokenAddress);
      // Don't overwrite a richer opportunity-derived price.
      if (!byAddress.has(key)) {
        byAddress.set(key, positionPrice);
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

export function useEarnTokenPrice(asset: {
  chainId: EarnChainId;
  tokenAddress?: string | null;
}): number | null {
  const { address } = useAccount();
  const { getPrice } = useEarnPrices({ chainId: asset.chainId, userAddress: address ?? null });
  const { ethPrice } = useETHPrice();
  if (asset.tokenAddress && isNativeEth(asset.tokenAddress)) {
    return parseFiniteNumber(ethPrice, { min: 0 }) || null;
  }
  return getPrice(asset);
}
