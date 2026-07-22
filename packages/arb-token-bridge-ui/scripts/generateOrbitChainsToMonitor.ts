import fs from 'fs';

import { getChainToMonitor, getOrbitChainsOutputFile, getOrbitChainsToMonitor } from './utils';

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
  fs.writeFileSync(`./public/${getOrbitChainsOutputFile()}`, resultsJson);
}

generateOrbitChainsToMonitor();
