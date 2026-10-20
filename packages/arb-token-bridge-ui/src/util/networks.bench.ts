import { bench, describe } from 'vitest';

import { ChainId } from '../types/ChainId';
import {
  getChainByChainId,
  getChains,
  getDestinationChainIds,
  initializeBridgeNetworks,
  isNetwork,
  sortChainIds,
} from './networks';

// Registers the Orbit chains with the Arbitrum SDK, as the app does on load
initializeBridgeNetworks();

// Names don't include the number of chains, so they match between master and a PR adding a chain
const chainIds = getChains({ includeRootChainsWithoutDestination: true }).map(
  (chain) => chain.chainId,
);

describe('chain lookups', () => {
  // getArbitrumNetwork() throws for chains that aren't Arbitrum chains, and isNetwork catches it
  bench('isNetwork, Ethereum', () => {
    isNetwork(ChainId.Ethereum);
  });

  bench('isNetwork, Arbitrum One', () => {
    isNetwork(ChainId.ArbitrumOne);
  });

  bench('isNetwork, all chains', () => {
    chainIds.forEach((chainId) => isNetwork(chainId));
  });

  bench('getChainByChainId, Arbitrum One', () => {
    getChainByChainId(ChainId.ArbitrumOne);
  });

  bench('getDestinationChainIds, Ethereum', () => {
    getDestinationChainIds(ChainId.Ethereum);
  });

  bench('getDestinationChainIds, Arbitrum One with LiFi', () => {
    getDestinationChainIds(ChainId.ArbitrumOne, { includeLifiEnabledChainPairs: true });
  });

  bench('sortChainIds, all chains', () => {
    // sortChainIds sorts in place, so sort a reversed copy each time
    sortChainIds([...chainIds].reverse());
  });
});
