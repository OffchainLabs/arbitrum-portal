import fs from 'fs';

import { isEnterpriseChain } from '../src/util/enterpriseChains';
import { getOrbitChains } from '../src/util/orbitChainsList';
import { getChainToMonitor } from './utils';

// enterprise chains alert to their own slack channels, so they are monitored
// in a separate run from the other orbit chains
const enterpriseMode = process.env.MONITOR_ENTERPRISE_CHAINS === 'true';

function getOrbitChainsToMonitor() {
  const orbitChains = getOrbitChains({ mainnet: true, testnet: false });

  if (enterpriseMode) {
    return orbitChains.filter((orbitChain) => isEnterpriseChain(orbitChain.chainId));
  }

  return orbitChains.filter((orbitChain) => !isEnterpriseChain(orbitChain.chainId));
}

function getOutputFile() {
  if (enterpriseMode) {
    return '__auto-generated-enterprise-chains.json';
  }

  return '__auto-generated-orbit-chains.json';
}

async function generateOrbitChainsToMonitor() {
  // make the orbit chain data compatible with the orbit-data required by the retryable-monitoring script
  const orbitChainsToMonitor = getOrbitChainsToMonitor().map((orbitChain) => {
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

  // write the chains json, we will use it as an input to the retryable-monitoring script
  const resultsJson = JSON.stringify(
    {
      childChains: orbitChainsToMonitor,
    },
    null,
    2,
  );
  fs.writeFileSync(`./public/${getOutputFile()}`, resultsJson);
}

generateOrbitChainsToMonitor();
