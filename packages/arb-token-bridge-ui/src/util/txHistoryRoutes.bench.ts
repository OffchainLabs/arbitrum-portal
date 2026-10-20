import { bench, describe } from 'vitest';

import { initializeBridgeNetworks } from './networks';
import { getMultiChainFetchList, getTxHistoryRoutes } from './txHistoryRoutes';

// Registers the Orbit chains with the Arbitrum SDK, as the app does on load
initializeBridgeNetworks();

describe('transaction history', () => {
  bench('getMultiChainFetchList', () => {
    getMultiChainFetchList();
  });

  bench('getTxHistoryRoutes, mainnet', () => {
    getTxHistoryRoutes({ isTestnetMode: false });
  });
});
