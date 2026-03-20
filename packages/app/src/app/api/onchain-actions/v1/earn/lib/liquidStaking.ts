import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

/**
 * Data source mappings for liquid staking opportunities
 * Maps token addresses to their external data source IDs
 *
 * Note: Dune query IDs are imported from duneQueries.ts to avoid circular dependency
 */
import { getDuneQueryIds } from './duneQueries';
import { fetchDuneCurrentData, fetchDuneCurrentDataMerged } from './duneService';

export const LIQUID_STAKING_DATA_SOURCES = {
  [CommonAddress.ArbitrumOne.WSTETH]: {
    duneQueryIds: getDuneQueryIds(CommonAddress.ArbitrumOne.WSTETH), // Lido APY and TVL query IDs (resolved as separate IDs)
  },
  [CommonAddress.ArbitrumOne.WEETH]: {
    duneQueryIds: getDuneQueryIds(CommonAddress.ArbitrumOne.WEETH), // Ether.fi APY and TVL query IDs (separate)
  },
} as const;

/**
 * Get data source configuration for a liquid staking token
 */
export function getLiquidStakingDataSource(tokenAddress: string): {
  duneQueryIds: { apy: number | null; tvl: number | null };
} | null {
  const sources = LIQUID_STAKING_DATA_SOURCES[tokenAddress.toLowerCase()];
  if (!sources) {
    return null;
  }
  return {
    duneQueryIds: sources.duneQueryIds,
  };
}

export interface LiquidStakingOpportunitySeed {
  id: string;
  name: string;
  token: string;
  tokenDecimals: number;
  tokenIcon: string;
  tokenNetwork: string;
  protocol: string;
  protocolIcon: string;
  vaultAddress: string;
  rawApy: number | null;
  rawTvl: number | null;
  apyBreakdown?: { base: number; reward: number; total: number };
}

export const LIQUID_STAKING_OPPORTUNITIES: LiquidStakingOpportunitySeed[] = [
  {
    id: CommonAddress.ArbitrumOne.WSTETH,
    name: 'Liquid Staked ETH',
    token: 'wstETH',
    tokenDecimals: 18,
    tokenIcon: 'https://assets.coingecko.com/coins/images/18834/large/wstETH.png',
    tokenNetwork: 'Arbitrum One',
    protocol: 'Lido',
    protocolIcon: '/images/lido-logo.svg',
    vaultAddress: CommonAddress.ArbitrumOne.WSTETH,
    rawApy: null,
    rawTvl: null,
  },
  {
    id: CommonAddress.ArbitrumOne.WEETH,
    name: 'Liquid Staked ETH',
    token: 'weETH',
    tokenDecimals: 18,
    tokenIcon: 'https://assets.coingecko.com/coins/images/33033/large/weETH.png',
    tokenNetwork: 'Arbitrum One',
    protocol: 'Ether.fi',
    protocolIcon: '/images/etherfi-logo.svg',
    vaultAddress: CommonAddress.ArbitrumOne.WEETH,
    rawApy: null,
    rawTvl: null,
  },
];

export function getLiquidStakingOpportunity(
  tokenAddress: string,
): LiquidStakingOpportunitySeed | undefined {
  return LIQUID_STAKING_OPPORTUNITIES.find(
    (opp) => opp.id.toLowerCase() === tokenAddress.toLowerCase(),
  );
}

/**
 * Update a liquid staking opportunity with current APY/TVL data from Dune
 * This is a reusable function that can be used in both getOpportunities and getOpportunityDetails
 *
 * @param opportunity - The opportunity to update (will be mutated)
 * @returns Promise that resolves when update is complete (or failed silently)
 */
export async function updateLiquidStakingOpportunityWithDuneData(
  opportunity: LiquidStakingOpportunitySeed,
): Promise<void> {
  const dataSource = getLiquidStakingDataSource(opportunity.id);
  if (!dataSource?.duneQueryIds.apy) {
    // Not a supported liquid staking token with Dune data source, skip update
    return;
  }

  try {
    // Fetch current data - if TVL query is separate, merge the results
    const currentData =
      dataSource.duneQueryIds.tvl && dataSource.duneQueryIds.tvl !== dataSource.duneQueryIds.apy
        ? await fetchDuneCurrentDataMerged(dataSource.duneQueryIds.apy, dataSource.duneQueryIds.tvl)
        : await fetchDuneCurrentData(dataSource.duneQueryIds.apy);

    // Update opportunity with real data if available
    if (currentData.apy !== null) {
      opportunity.rawApy = currentData.apy;
      // Update apyBreakdown if it exists (preserve base/reward ratio, update total)
      if (opportunity.apyBreakdown) {
        const oldTotal = opportunity.apyBreakdown.total || currentData.apy;
        const ratio = oldTotal > 0 ? currentData.apy / oldTotal : 1;
        // Scale base and reward proportionally to maintain ratio
        opportunity.apyBreakdown.base = (opportunity.apyBreakdown.base || 0) * ratio;
        opportunity.apyBreakdown.reward = (opportunity.apyBreakdown.reward || 0) * ratio;
        opportunity.apyBreakdown.total = currentData.apy;
      }
    }
    if (currentData.tvl !== null) {
      opportunity.rawTvl = currentData.tvl;
    }
  } catch (error) {
    // Leave APY/TVL as unknown if Dune fetch fails.
    console.error(`Failed to fetch Dune data for ${opportunity.id}:`, error);
  }
}

/**
 * Update multiple liquid staking opportunities with current APY/TVL data from Dune
 * Fetches data in parallel for better performance
 *
 * @param opportunities - Array of opportunities to update (will be mutated)
 * @returns Promise that resolves when all updates are complete
 */
export async function updateLiquidStakingOpportunitiesWithDuneData(
  opportunities: LiquidStakingOpportunitySeed[],
): Promise<void> {
  // Fetch data for all opportunities in parallel
  const updatePromises = opportunities.map((opp) =>
    updateLiquidStakingOpportunityWithDuneData(opp),
  );
  await Promise.allSettled(updatePromises);
}
