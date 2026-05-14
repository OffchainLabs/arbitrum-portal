import { describe, expect, it } from 'vitest';

import { getOrbitChains, orbitMainnets, orbitTestnets } from '../orbitChainsList';

describe('getOrbitChains', () => {
  it('returns a non-empty list of orbit chains by default', () => {
    // Regression guard: if a circular import appears or if the function is not run as expected, this call throws at module init.
    const chains = getOrbitChains();
    expect(chains.length).toBeGreaterThan(0);
  });

  it('returns mainnet chains only when testnet is disabled', () => {
    const chains = getOrbitChains({ mainnet: true, testnet: false });
    const testnetIds = Object.keys(orbitTestnets).map(Number);

    expect(chains.length).toBe(Object.keys(orbitMainnets).length);
    expect(chains.some((chain) => testnetIds.includes(chain.chainId))).toBe(false);
  });

  it('returns testnet chains only when mainnet is disabled', () => {
    const chains = getOrbitChains({ mainnet: false, testnet: true });
    const mainnetIds = Object.keys(orbitMainnets).map(Number);

    expect(chains.length).toBe(Object.keys(orbitTestnets).length);
    expect(chains.some((chain) => mainnetIds.includes(chain.chainId))).toBe(false);
  });

  it('returns fields required by the monitoring script on every chain', () => {
    // The generateOrbitChainsToMonitor script reads these fields off each chain.
    const chains = getOrbitChains({ mainnet: true, testnet: false });

    for (const chain of chains) {
      expect(typeof chain.chainId).toBe('number');
      expect(typeof chain.rpcUrl).toBe('string');
      expect(chain.rpcUrl.length).toBeGreaterThan(0);
      expect(typeof chain.ethBridge?.inbox).toBe('string');
    }
  });
});
