import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';
import { beforeAll, describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { isNetwork } from './networks';
import orbitChainsData from './orbitChainsData.json';
import { getTxHistoryRoutes } from './txHistoryRoutes';

function getUndirectedKey(chainIdA: number, chainIdB: number): string {
  return chainIdA < chainIdB ? `${chainIdA}-${chainIdB}` : `${chainIdB}-${chainIdA}`;
}

describe('getTxHistoryRoutes', () => {
  beforeAll(() => {
    // Orbit chains referenced by LiFi routes are registered at runtime in the app.
    for (const chainId of [ChainId.ApeChain, ChainId.Superposition, ChainId.RobinhoodChain]) {
      registerCustomArbitrumNetwork(
        orbitChainsData.mainnet.find((chain) => chain.chainId === chainId)!,
      );
    }
  });

  it('returns routes for both network modes', () => {
    expect(getTxHistoryRoutes({ isTestnetMode: false }).length).toBeGreaterThan(0);
    expect(getTxHistoryRoutes({ isTestnetMode: true }).length).toBeGreaterThan(0);
  });

  it('only returns routes whose endpoints match the requested mode', () => {
    for (const isTestnetMode of [false, true]) {
      for (const route of getTxHistoryRoutes({ isTestnetMode })) {
        expect(isNetwork(route.parentChainId).isTestnet).toBe(isTestnetMode);
        expect(isNetwork(route.childChainId).isTestnet).toBe(isTestnetMode);
      }
    }
  });

  it('dedupes routes as undirected pairs (A<>B appears once)', () => {
    for (const isTestnetMode of [false, true]) {
      const keys = getTxHistoryRoutes({ isTestnetMode }).map((route) =>
        getUndirectedKey(route.parentChainId, route.childChainId),
      );
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('includes the canonical and CCTP routes for each mode', () => {
    const mainnetKeys = getTxHistoryRoutes({ isTestnetMode: false }).map((route) =>
      getUndirectedKey(route.parentChainId, route.childChainId),
    );
    expect(mainnetKeys).toContain(getUndirectedKey(ChainId.Ethereum, ChainId.ArbitrumOne));
    expect(mainnetKeys).toContain(getUndirectedKey(ChainId.Ethereum, ChainId.ArbitrumNova));

    const testnetKeys = getTxHistoryRoutes({ isTestnetMode: true }).map((route) =>
      getUndirectedKey(route.parentChainId, route.childChainId),
    );
    expect(testnetKeys).toContain(getUndirectedKey(ChainId.Sepolia, ChainId.ArbitrumSepolia));
  });

  it('includes LiFi-only routes (e.g. Arbitrum Nova <> Arbitrum One)', () => {
    const mainnetKeys = getTxHistoryRoutes({ isTestnetMode: false }).map((route) =>
      getUndirectedKey(route.parentChainId, route.childChainId),
    );
    expect(mainnetKeys).toContain(getUndirectedKey(ChainId.ArbitrumNova, ChainId.ArbitrumOne));
    expect(mainnetKeys).toContain(getUndirectedKey(ChainId.Ethereum, ChainId.ApeChain));
  });
});
