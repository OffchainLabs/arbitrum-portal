import { WEETH_ADDRESS, WSTETH_ADDRESS } from './liquidStakingConstants';

/**
 * Dune Analytics Query IDs for liquid staking data
 * These correspond to public dashboard queries
 */
export const DUNE_QUERY_IDS = {
  // Lido wstETH APY query
  // Query: https://dune.com/queries/570874/1068499
  // Returns: time, protocol_apr, Lido staking APR (instant), Lido staking APR (ma_7), Lido staking APR (ma_30), protocol APR (ma_7)
  // We use "Lido staking APR (instant)" for APY
  WSTETH_APY: 570874,

  // Lido wstETH TVL query
  // Query: https://dune.com/queries/837989/1465113
  // Returns: day, lido_deposited, buffer, price, TVL, TVL_avg30dd
  // We use "TVL" column for TVL
  WSTETH_TVL: 837989,

  // Ether.fi weETH APY query
  // Dashboard: https://dune.com/ether_fi/eeth-staking
  // Query: https://dune.com/queries/3961686/6666506
  WEETH_APY: 3961686,

  // Ether.fi weETH TVL query
  // Dashboard: https://dune.com/ether_fi/eeth-staking
  // Query: https://dune.com/queries/3961816/6666585
  // TVL column: token_supply_usd
  WEETH_TVL: 3961816,
} as const;

type DuneQueryIds = { apy: number; tvl: number };

/**
 * Mapping of liquid staking token addresses to their Dune query IDs
 * Liquid staking tokens use explicit APY and TVL query IDs.
 *
 * Note: Token addresses are imported from liquidStaking.ts to avoid duplication
 */
export const LIQUID_STAKING_DUNE_QUERIES: Record<string, DuneQueryIds> = {
  [WSTETH_ADDRESS.toLowerCase()]: {
    apy: DUNE_QUERY_IDS.WSTETH_APY,
    tvl: DUNE_QUERY_IDS.WSTETH_TVL,
  },
  [WEETH_ADDRESS.toLowerCase()]: {
    apy: DUNE_QUERY_IDS.WEETH_APY,
    tvl: DUNE_QUERY_IDS.WEETH_TVL,
  },
};

/**
 * Get Dune query ID(s) for a liquid staking token address
 * Returns APY query ID, and optionally TVL query ID if separate
 */
export function getDuneQueryIds(tokenAddress: string): {
  apy: number | null;
  tvl: number | null;
} {
  const queryConfig = LIQUID_STAKING_DUNE_QUERIES[tokenAddress.toLowerCase()];
  if (!queryConfig) {
    return { apy: null, tvl: null };
  }

  return {
    apy: queryConfig.apy,
    tvl: queryConfig.tvl,
  };
}

/**
 * @deprecated Use getDuneQueryIds instead
 * Get Dune query ID for a liquid staking token address (returns APY query ID)
 */
export function getDuneQueryId(tokenAddress: string): number | null {
  const ids = getDuneQueryIds(tokenAddress);
  return ids.apy;
}
