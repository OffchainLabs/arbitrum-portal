import { PublicClient, erc20Abi, formatUnits, getAddress } from 'viem';

import { ChainId } from '@/bridge/types/ChainId';

import { OpportunityCategory, type StandardUserPosition, Vendor } from '../types';
import { type LiquidStakingOpportunitySeed } from './liquidStaking';
import {
  type ZerionPriceLookup,
  getZerionLookupCacheKey,
  getZerionPriceLookup,
} from './zerionPriceSources';
import { fetchZerionCurrentPrices } from './zerionService';

export async function fetchLiquidStakingPriceMap(
  opportunities: LiquidStakingOpportunitySeed[],
): Promise<Map<string, number | null>> {
  const lookupByOppId = new Map<string, ZerionPriceLookup | null>();
  for (const opportunity of opportunities) {
    lookupByOppId.set(
      opportunity.id.toLowerCase(),
      getZerionPriceLookup({
        chainId: ChainId.ArbitrumOne,
        tokenAddress: opportunity.id,
        assetSymbol: opportunity.token,
      }),
    );
  }

  const validLookups = Array.from(lookupByOppId.values()).filter(
    (lookup): lookup is ZerionPriceLookup => lookup !== null,
  );
  // Don't fail the whole positions endpoint if price setup is misconfigured —
  // fall back to an empty map so balances still surface with valueUsd: null.
  let priceMap: Map<string, number | null> = new Map();
  try {
    priceMap = await fetchZerionCurrentPrices(validLookups);
  } catch (error) {
    console.warn('[earn][lifi] price fetch failed, continuing without prices:', error);
  }

  const tokenPriceMap = new Map<string, number | null>();
  for (const [oppId, lookup] of lookupByOppId) {
    if (!lookup) {
      tokenPriceMap.set(oppId, null);
      continue;
    }
    const price = priceMap.get(getZerionLookupCacheKey(lookup)) ?? null;
    tokenPriceMap.set(oppId, price !== null && price > 0 ? price : null);
  }
  return tokenPriceMap;
}

export async function fetchLifiUserPositions(params: {
  publicClient: PublicClient;
  opportunities: LiquidStakingOpportunitySeed[];
  userAddress: string;
}): Promise<StandardUserPosition[]> {
  const { publicClient, opportunities, userAddress } = params;

  const tokenPriceMap = await fetchLiquidStakingPriceMap(opportunities);

  const positionPromises = opportunities.map(async (opportunity) => {
    const tokenAddress = opportunity.id;

    try {
      const balance = await publicClient.readContract({
        address: getAddress(tokenAddress),
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [getAddress(userAddress)],
      });

      if (balance === BigInt(0)) {
        return null;
      }

      const decimalsNumber = opportunity.tokenDecimals;
      const balanceInTokens = parseFloat(formatUnits(balance, decimalsNumber));
      const effectivePrice = tokenPriceMap.get(tokenAddress.toLowerCase()) ?? null;
      const valueUsdNumber =
        effectivePrice !== null && Number.isFinite(effectivePrice)
          ? balanceInTokens * effectivePrice
          : null;
      // rawApy is a percentage value (e.g. 3.5 means 3.5%)
      const apy = opportunity.rawApy ?? 0;
      const projectedEarningsUsdNumber =
        valueUsdNumber !== null && valueUsdNumber > 0 && apy > 0
          ? (valueUsdNumber * apy) / 100
          : undefined;

      const position: StandardUserPosition = {
        opportunityId: tokenAddress,
        category: OpportunityCategory.LiquidStaking,
        vendor: Vendor.LiFi,
        network: 'arbitrum',
        amount: balance.toString(),
        valueUsd: valueUsdNumber,
        tokenAddress,
        tokenSymbol: opportunity.token,
        tokenDecimals: decimalsNumber,
        tokenIcon: opportunity.tokenIcon,
        projectedEarningsUsd: projectedEarningsUsdNumber,
        tokenPriceUsd: effectivePrice,
        opportunity: {
          id: tokenAddress,
          name: opportunity.name,
          protocol: opportunity.protocol,
          protocolLogo: opportunity.protocolIcon,
          apy,
          tvl: opportunity.rawTvl ?? undefined,
        },
      };
      return position;
    } catch (error) {
      console.error(`Failed to fetch balance for ${tokenAddress}:`, error);
      return null;
    }
  });

  const results = await Promise.all(positionPromises);
  return results.filter((pos): pos is StandardUserPosition => pos !== null);
}
