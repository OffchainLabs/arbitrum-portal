import { PublicClient, erc20Abi, getAddress } from 'viem';
import { formatUnits } from 'viem';

import { ChainId } from '@/bridge/types/ChainId';

import { OpportunityCategory, type StandardUserPosition, Vendor } from '../types';
import { getDunePriceLookup } from './dunePriceSources';
import { fetchDuneCurrentPriceByAddress } from './duneService';
import { type LiquidStakingOpportunitySeed } from './liquidStaking';

export async function fetchLifiUserPositions(params: {
  publicClient: PublicClient;
  opportunities: LiquidStakingOpportunitySeed[];
  userAddress: string;
}): Promise<StandardUserPosition[]> {
  const { publicClient, opportunities, userAddress } = params;
  const priceCache = new Map<string, number | null>();
  const tokenPriceEntries = await Promise.all(
    opportunities.map(async (opportunity) => {
      const priceLookup = getDunePriceLookup({
        chainId: ChainId.ArbitrumOne,
        tokenAddress: opportunity.id,
        assetSymbol: opportunity.token,
      });

      if (!priceLookup) {
        return [opportunity.id.toLowerCase(), null] as const;
      }

      const cacheKey = `${priceLookup.chainId}:${priceLookup.tokenAddress.toLowerCase()}`;
      let price = priceCache.get(cacheKey);
      if (price === undefined) {
        price = await fetchDuneCurrentPriceByAddress(priceLookup.tokenAddress, priceLookup.chainId);
        priceCache.set(cacheKey, price);
      }

      const validPrice = price !== null && Number.isFinite(price) && price > 0 ? price : null;
      return [opportunity.id.toLowerCase(), validPrice] as const;
    }),
  );
  const tokenPriceMap = new Map<string, number | null>(tokenPriceEntries);

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
