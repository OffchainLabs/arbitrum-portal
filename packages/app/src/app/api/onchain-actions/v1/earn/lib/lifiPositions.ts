import { Address, PublicClient, getAddress } from 'viem';
import { formatUnits } from 'viem';

import { OpportunityCategory, type StandardUserPosition, Vendor } from '../types';
import { ERC20_BALANCE_DECIMALS_ABI } from './erc20Abi';
import { type LiquidStakingOpportunitySeed, getLiquidStakingDataSource } from './liquidStaking';
import { fetchZerionCurrentPrice } from './zerionService';

type CoinbaseEthSpotResponse = {
  data?: {
    amount?: string;
  };
};

async function fetchEthPrice(): Promise<number | null> {
  try {
    const response = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot', {
      next: {
        revalidate: 300,
      },
    });
    if (!response.ok) {
      throw new Error(
        `Coinbase ETH price request failed (${response.status} ${response.statusText})`,
      );
    }

    const data = (await response.json()) as CoinbaseEthSpotResponse;
    const ethPrice = Number(data.data?.amount);
    if (!Number.isFinite(ethPrice) || ethPrice <= 0) {
      throw new Error('Coinbase ETH price response was invalid');
    }

    return ethPrice;
  } catch (error) {
    console.error('Failed to fetch ETH price:', error);
    return null;
  }
}

async function getTokenPriceByAddress(
  opportunities: LiquidStakingOpportunitySeed[],
): Promise<Map<string, number | null>> {
  const tokenPriceByAddress = new Map<string, number | null>();

  await Promise.all(
    opportunities.map(async (opportunity) => {
      const dataSource = getLiquidStakingDataSource(opportunity.id);
      if (!dataSource?.zerionId) {
        tokenPriceByAddress.set(opportunity.id.toLowerCase(), null);
        return;
      }

      try {
        const zerionPrice = await fetchZerionCurrentPrice(dataSource.zerionId);
        tokenPriceByAddress.set(opportunity.id.toLowerCase(), zerionPrice);
      } catch {
        tokenPriceByAddress.set(opportunity.id.toLowerCase(), null);
      }
    }),
  );

  return tokenPriceByAddress;
}

export async function fetchLifiUserPositions(params: {
  publicClient: PublicClient;
  opportunities: LiquidStakingOpportunitySeed[];
  userAddress: string;
}): Promise<StandardUserPosition[]> {
  const { publicClient, opportunities, userAddress } = params;
  const ethPrice = await fetchEthPrice();
  const tokenPriceByAddress = await getTokenPriceByAddress(opportunities);

  const positionPromises = opportunities.map(async (opportunity) => {
    const tokenAddress = opportunity.id;

    try {
      const [balance, decimals] = await Promise.all([
        publicClient.readContract({
          address: getAddress(tokenAddress),
          abi: ERC20_BALANCE_DECIMALS_ABI,
          functionName: 'balanceOf',
          args: [userAddress as Address],
        }),
        publicClient
          .readContract({
            address: getAddress(tokenAddress),
            abi: ERC20_BALANCE_DECIMALS_ABI,
            functionName: 'decimals',
          })
          .catch(() => 18),
      ]);

      if (balance === BigInt(0)) {
        return null;
      }

      const decimalsNumber = Number(decimals);
      const balanceInTokens = parseFloat(formatUnits(balance, decimalsNumber));
      const tokenPrice = tokenPriceByAddress.get(tokenAddress.toLowerCase());
      const effectivePrice =
        tokenPrice != null && Number.isFinite(tokenPrice) && tokenPrice > 0 ? tokenPrice : ethPrice;
      const valueUsdNumber =
        effectivePrice !== null && Number.isFinite(effectivePrice)
          ? balanceInTokens * effectivePrice
          : 0;
      const apy = opportunity.rawApy ?? undefined;
      const projectedEarningsUsdNumber =
        typeof apy === 'number' && valueUsdNumber > 0 ? (valueUsdNumber * apy) / 100 : undefined;

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
