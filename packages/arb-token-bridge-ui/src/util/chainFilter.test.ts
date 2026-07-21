import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import {
  TxHistoryChainFilter,
  getChainFilterKey,
  matchesChainFilter,
  resolveChainFilter,
} from './chainFilter';

const coreChainIds = [
  ChainId.Ethereum,
  ChainId.ArbitrumOne,
  ChainId.RobinhoodChain,
  ChainId.ArbitrumNova,
];

const allCoreFilter: TxHistoryChainFilter = { type: 'all-core', coreChainIds };

function matches(
  filter: TxHistoryChainFilter,
  sourceChainId: number,
  destinationChainId: number,
): boolean {
  return matchesChainFilter({ filter, sourceChainId, destinationChainId });
}

describe('resolveChainFilter', () => {
  it('defaults to All Core Chains until the user makes a selection', () => {
    expect(resolveChainFilter({ selection: null, isTestnetMode: false, coreChainIds })).toEqual(
      allCoreFilter,
    );
  });

  it('keeps an explicit "All Core Chains" (null chainId) selection', () => {
    expect(
      resolveChainFilter({
        selection: { chainId: null, isTestnetMode: false },
        isTestnetMode: false,
        coreChainIds,
      }),
    ).toEqual(allCoreFilter);
  });

  it('re-defaults when the selection was made in the other testnet mode', () => {
    // e.g. the user filtered on mainnet, then switched to testnet: the mainnet
    // chain doesn't exist there, so the filter re-defaults to All Core Chains
    expect(
      resolveChainFilter({
        selection: { chainId: ChainId.ArbitrumOne, isTestnetMode: false },
        isTestnetMode: true,
        coreChainIds: [ChainId.Sepolia, ChainId.ArbitrumSepolia],
      }),
    ).toEqual({ type: 'all-core', coreChainIds: [ChainId.Sepolia, ChainId.ArbitrumSepolia] });
  });

  it('resolves a core chain to a core-chain filter', () => {
    expect(
      resolveChainFilter({
        selection: { chainId: ChainId.ArbitrumOne, isTestnetMode: false },
        isTestnetMode: false,
        coreChainIds,
      }),
    ).toEqual({ type: 'core-chain', chainId: ChainId.ArbitrumOne, coreChainIds });
  });

  it('resolves a longtail chain to a longtail-chain filter', () => {
    expect(
      resolveChainFilter({
        selection: { chainId: ChainId.ApeChain, isTestnetMode: false },
        isTestnetMode: false,
        coreChainIds,
      }),
    ).toEqual({ type: 'longtail-chain', chainId: ChainId.ApeChain });
  });
});

describe('getChainFilterKey', () => {
  it('identifies the filter for SWR keys', () => {
    expect(getChainFilterKey(allCoreFilter)).toBe(`all-core-${coreChainIds.join('_')}`);
    expect(getChainFilterKey({ type: 'longtail-chain', chainId: ChainId.ApeChain })).toBe(
      `chain-${ChainId.ApeChain}`,
    );
    expect(
      getChainFilterKey({ type: 'core-chain', chainId: ChainId.ArbitrumOne, coreChainIds }),
    ).toBe(`chain-${ChainId.ArbitrumOne}-core-${coreChainIds.join('_')}`);
  });

  it('differs between network modes for the default filter', () => {
    // The fetch result depends on the core set, which differs per mode. A
    // mode-invariant key would pin SWR to an empty result fetched during a
    // testnet-mode toggle (the filter is debounced behind the key's mode flag).
    const mainnetKey = getChainFilterKey(allCoreFilter);
    const testnetKey = getChainFilterKey({
      type: 'all-core',
      coreChainIds: [ChainId.Sepolia, ChainId.ArbitrumSepolia],
    });

    expect(mainnetKey).not.toBe(testnetKey);
  });
});

describe('matchesChainFilter', () => {
  it('All Core Chains matches only routes with both endpoints core', () => {
    expect(matches(allCoreFilter, ChainId.Ethereum, ChainId.ArbitrumOne)).toBe(true);
    expect(matches(allCoreFilter, ChainId.ArbitrumOne, ChainId.RobinhoodChain)).toBe(true);
    // core <> longtail routes are excluded from the default view
    expect(matches(allCoreFilter, ChainId.ArbitrumOne, ChainId.ApeChain)).toBe(false);
    expect(matches(allCoreFilter, ChainId.Base, ChainId.ApeChain)).toBe(false);
  });

  it('a core-chain filter matches only that chain’s routes with other core chains', () => {
    const arbOneFilter: TxHistoryChainFilter = {
      type: 'core-chain',
      chainId: ChainId.ArbitrumOne,
      coreChainIds,
    };

    expect(matches(arbOneFilter, ChainId.Ethereum, ChainId.ArbitrumOne)).toBe(true);
    expect(matches(arbOneFilter, ChainId.ArbitrumOne, ChainId.RobinhoodChain)).toBe(true);
    // core <> longtail routes stay excluded, keeping the selection indexed
    expect(matches(arbOneFilter, ChainId.ArbitrumOne, ChainId.ApeChain)).toBe(false);
    // routes between other core chains are excluded
    expect(matches(arbOneFilter, ChainId.Ethereum, ChainId.ArbitrumNova)).toBe(false);
  });

  it('a longtail-chain filter matches every route touching that chain, in either direction', () => {
    const apeChainFilter: TxHistoryChainFilter = {
      type: 'longtail-chain',
      chainId: ChainId.ApeChain,
    };

    // canonical parent route
    expect(matches(apeChainFilter, ChainId.ArbitrumOne, ChainId.ApeChain)).toBe(true);
    expect(matches(apeChainFilter, ChainId.ApeChain, ChainId.ArbitrumOne)).toBe(true);
    // non-canonical routes (e.g. LiFi) are viewable under this selection only
    expect(matches(apeChainFilter, ChainId.Ethereum, ChainId.ApeChain)).toBe(true);
    expect(matches(apeChainFilter, ChainId.ApeChain, ChainId.Superposition)).toBe(true);
    // routes not touching the chain are excluded
    expect(matches(apeChainFilter, ChainId.Ethereum, ChainId.ArbitrumOne)).toBe(false);
  });
});
