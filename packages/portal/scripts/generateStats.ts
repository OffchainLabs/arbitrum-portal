import fs from 'fs';
import dotenv from 'dotenv';
import { DuneClient } from '@duneanalytics/client-sdk';
import { sendErrorToSlack } from '../.notion/utils';
import { prepareJSON, publicFolder } from './utils';
import { OrbitTvlStats, PortalStats } from '../common/types';

dotenv.config({ path: '.env.local' });

if (!process.env.DUNE_API_KEY) {
  throw 'Unable to get Dune API key';
}

type DuneOrbitStats = {
  lifetime_active_wallets: number;
  lifetime_transactions: number;
  lifetime_median_fee_usd: number;
  devs: number;
  contracts_created: number;
};

const getTotalStatsFromDuneOrbit = async () => {
  try {
    console.log('Fetching total stats from Dune Orbit query...');
    const result = await queryDune(5437397);
    const stats = result?.[0];

    if (stats) {
      return stats as DuneOrbitStats;
    } else {
      return undefined;
    }
  } catch (e: any) {
    throw new Error(
      `Error while fetching stats from Dune Orbit query: ${e.message}`,
    );
  }
};

const queryDune = async (queryId: number) => {
  const dune = new DuneClient(process.env.DUNE_API_KEY!);
  return (await dune.getLatestResult({ queryId })).result?.rows;
};

const getTotalStatsFromDune = async () => {
  try {
    console.log('Fetching total stats from Dune...');
    const result = await queryDune(3996089);
    const totalStats = result?.find((stat) => stat?.chain_type === 'total');

    if (totalStats) {
      return {
        totalOrbitChainsOnMainnet: totalStats.total_chains as number,
        totalAmountBridgedToOrbit: totalStats.balance_usd as number,
      };
    } else {
      return undefined;
    }
  } catch (e: any) {
    throw new Error(`Error fetching overall stats from Dune: ${e.message}`);
  }
};

const getOrbitTvlStats = async () => {
  try {
    console.log('Fetching TVL stats from Dune...');
    const result = await queryDune(4628498);
    const tvls: OrbitTvlStats = {};

    result?.forEach((row) => {
      if (
        row.slug &&
        typeof row.slug == 'string' &&
        row.overall_tvl &&
        typeof row.overall_tvl == 'number'
      ) {
        tvls[row.slug] = row.overall_tvl;
      }

      if (row.slug === 'total') {
        tvls['chain_count'] = row.chain_count as number;
      }
    });

    return tvls;
  } catch (e: any) {
    throw new Error(`Error fetching TVL stats from Dune: ${e.message}`);
  }
};

const getLearnStats = async () => {
  try {
    console.log('Fetching Learn page stats from Dune...');
    const result = (await queryDune(4193752))?.[0];

    if (result) {
      return {
        totalActiveWallets: result.total_active_wallets as number,
        averageTxnsPerDayThisMonth:
          result.rolling_30d_avg_trx_per_day_arb as number,
        cheaperThanEthFactor: result.cheaper_than_eth as number,
      };
    }

    return undefined;
  } catch (e: any) {
    throw new Error(`Error fetching Learn page stats from Dune: ${e.message}`);
  }
};

async function start() {
  const stats: PortalStats = {
    totalOrbitChainsOnMainnet: 20,
    medianFeePerOrbitTransaction: 0.00006,
    totalWalletsConnectedToOrbitChains: 300,
    totalAmountBridgedToOrbit: 150000000,
    totalOrbitDevelopers: 140,
    totalActiveWallets: 30000000,
    averageTxnsPerDayThisMonth: 787368,
    cheaperThanEthFactor: 337,
    orbitChainsTvl: {},
  };

  const duneStats = await getTotalStatsFromDune();

  if (duneStats) {
    stats.totalAmountBridgedToOrbit = duneStats.totalAmountBridgedToOrbit; // can be overriden later in the script depending on other result
  }

  const duneOrbitStats = await getTotalStatsFromDuneOrbit();

  if (duneOrbitStats) {
    stats.medianFeePerOrbitTransaction = duneOrbitStats.lifetime_median_fee_usd;
    stats.totalWalletsConnectedToOrbitChains =
      duneOrbitStats.lifetime_active_wallets;
    stats.totalOrbitDevelopers = duneOrbitStats.devs;
  }

  const orbitChainsTvl = await getOrbitTvlStats();
  if (orbitChainsTvl && Object.keys(orbitChainsTvl).length > 0) {
    stats.orbitChainsTvl = orbitChainsTvl;

    if (orbitChainsTvl['total']) {
      stats.totalAmountBridgedToOrbit = orbitChainsTvl['total'];
    }

    stats.totalOrbitChainsOnMainnet = orbitChainsTvl['chain_count'];
  }

  const learnStats = await getLearnStats();
  if (learnStats) {
    stats.totalActiveWallets = learnStats.totalActiveWallets;
    stats.averageTxnsPerDayThisMonth = learnStats.averageTxnsPerDayThisMonth;
    stats.cheaperThanEthFactor = learnStats.cheaperThanEthFactor;
  }

  console.log('Writing to __auto-generated-stats.json...');
  fs.writeFileSync(
    publicFolder('/__auto-generated-stats.json'),
    prepareJSON(stats),
  );
}

async function main() {
  try {
    await start();
  } catch (error: Error | any) {
    await sendErrorToSlack({
      title: 'Error in Portal Stats generator (Github action)',
      error:
        error?.message ?? 'Check Github Actions for complete error details',
    });
    throw error;
  }
}

main();
