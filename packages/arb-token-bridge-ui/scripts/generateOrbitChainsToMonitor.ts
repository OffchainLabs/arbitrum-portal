import fs from 'fs';

import { getOrbitChains } from '../src/util/orbitChainsList';
import { getChainToMonitor } from './utils';

function parseChainIds(envValue: string | undefined) {
  if (typeof envValue !== 'string' || envValue === '') {
    return undefined;
  }
  return envValue.split(',').map((chainId) => Number(chainId.trim()));
}

async function generateOrbitChainsToMonitor() {
  const includeChainIds = parseChainIds(process.env.MONITOR_INCLUDE_CHAIN_IDS);
  const excludeChainIds = parseChainIds(process.env.MONITOR_EXCLUDE_CHAIN_IDS);
  const outputFile = process.env.MONITOR_OUTPUT_FILE || '__auto-generated-orbit-chains.json';

  const orbitChains = getOrbitChains({ mainnet: true, testnet: false }).filter(
    (orbitChain) =>
      (!includeChainIds || includeChainIds.includes(orbitChain.chainId)) &&
      !excludeChainIds?.includes(orbitChain.chainId),
  );

  // make the orbit chain data compatible with the orbit-data required by the retryable-monitoring script
  const orbitChainsToMonitor = orbitChains.map((orbitChain) => {
    return getChainToMonitor({
      chain: orbitChain,
      rpcUrl: orbitChain.rpcUrl,
    });
  });

  // Ensure the public directory exists
  const publicDir = './public';
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // write to orbit-chains.json, we will use this json as an input to the retryable-monitoring script
  const resultsJson = JSON.stringify(
    {
      childChains: orbitChainsToMonitor,
    },
    null,
    2,
  );
  fs.writeFileSync(`./public/${outputFile}`, resultsJson);
}

generateOrbitChainsToMonitor();
