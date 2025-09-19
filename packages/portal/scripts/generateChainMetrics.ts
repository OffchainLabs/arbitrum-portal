import dotenv from 'dotenv';
import fs from 'fs';
import { fetchChainMetricsFromDune } from '../app/api/chains/metrics/utils';
import { fetchGasDataForChain } from './fetchGasData';
import { prepareJSON, publicFolder } from './utils';

// Load env variables from .env.local
dotenv.config({ path: '.env.local' });

async function start() {
  try {
    // Check for API key
    if (!process.env.DUNE_API_KEY) {
      throw new Error('Dune API key is not configured');
    }

    console.log('Fetching chain metrics directly from Dune API...');
    const chainMetrics = await fetchChainMetricsFromDune(
      process.env.DUNE_API_KEY,
    );

    const gassedMetrics = await Promise.all(
      chainMetrics.map(async (metric) => {
        const gasParams = await fetchGasDataForChain(metric.slug);
        return {
          ...metric,
          ...gasParams,
        };
      }),
    );

    console.log('Writing to __auto-generated-chain-metrics.json...');
    fs.writeFileSync(
      publicFolder('/__auto-generated-chain-metrics.json'),
      prepareJSON({
        content: gassedMetrics,
        lastUpdated: new Date().toISOString(),
      }),
    );

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

start();
