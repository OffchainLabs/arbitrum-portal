import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../src/types/ChainId';
import { getOrbitChainsOutputFile, getOrbitChainsToMonitor } from './utils';

describe('getOrbitChainsToMonitor', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('excludes enterprise chains by default', () => {
    vi.stubEnv('MONITOR_ENTERPRISE_CHAINS', '');

    const chainIds = getOrbitChainsToMonitor().map((orbitChain) => orbitChain.chainId);

    expect(chainIds.length).toBeGreaterThan(0);
    expect(chainIds).not.toContain(ChainId.RobinhoodChain);
    expect(getOrbitChainsOutputFile()).toBe('__auto-generated-orbit-chains.json');
  });

  it('returns only enterprise chains in enterprise mode', () => {
    vi.stubEnv('MONITOR_ENTERPRISE_CHAINS', 'true');

    const chainIds = getOrbitChainsToMonitor().map((orbitChain) => orbitChain.chainId);

    expect(chainIds).toEqual([ChainId.RobinhoodChain]);
    expect(getOrbitChainsOutputFile()).toBe('__auto-generated-enterprise-chains.json');
  });
});
