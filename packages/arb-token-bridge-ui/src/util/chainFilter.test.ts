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

  it('keeps an explicit "All Core Chains" (null chainIds) selection', () => {
    expect(
      resolveChainFilter({
        selection: { chainIds: null, isTestnetMode: false },
        isTestnetMode: false,
        coreChainIds,
      }),
    ).toEqual(allCoreFilter);
  });

  it('treats an empty chainIds selection as All Core Chains', () => {
    // unchecking the last core chain leaves nothing selected
    expect(
      resolveChainFilter({
        selection: { chainIds: [], isTestnetMode: false },
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
        selection: { chainIds: [ChainId.ArbitrumOne], isTestnetMode: false },
        isTestnetMode: true,
        coreChainIds: [ChainId.Sepolia, ChainId.ArbitrumSepolia],
      }),
    ).toEqual({ type: 'all-core', coreChainIds: [ChainId.Sepolia, ChainId.ArbitrumSepolia] });
  });

  it('resolves core chains to a core-chains filter', () => {
    expect(
      resolveChainFilter({
        selection: { chainIds: [ChainId.ArbitrumOne], isTestnetMode: false },
        isTestnetMode: false,
        coreChainIds,
      }),
    ).toEqual({ type: 'core-chains', chainIds: [ChainId.ArbitrumOne], coreChainIds });

    expect(
      resolveChainFilter({
        selection: { chainIds: [ChainId.ArbitrumOne, ChainId.Ethereum], isTestnetMode: false },
        isTestnetMode: false,
        coreChainIds,
      }),
    ).toEqual({
      type: 'core-chains',
      chainIds: [ChainId.ArbitrumOne, ChainId.Ethereum],
      coreChainIds,
    });
  });

  it('resolves a longtail chain to a longtail-chain filter', () => {
    expect(
      resolveChainFilter({
        selection: { chainIds: [ChainId.ApeChain], isTestnetMode: false },
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
      getChainFilterKey({ type: 'core-chains', chainIds: [ChainId.ArbitrumOne], coreChainIds }),
    ).toBe(`chains-${ChainId.ArbitrumOne}-core-${coreChainIds.join('_')}`);
  });

  it('is insensitive to the order core chains were checked in', () => {
    const checkedForward = getChainFilterKey({
      type: 'core-chains',
      chainIds: [ChainId.Ethereum, ChainId.ArbitrumOne],
      coreChainIds,
    });
    const checkedBackward = getChainFilterKey({
      type: 'core-chains',
      chainIds: [ChainId.ArbitrumOne, ChainId.Ethereum],
      coreChainIds,
    });

    expect(checkedForward).toBe(checkedBackward);
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

  it('a core-chains filter matches only the selected chains’ routes with other core chains', () => {
    const arbOneFilter: TxHistoryChainFilter = {
      type: 'core-chains',
      chainIds: [ChainId.ArbitrumOne],
      coreChainIds,
    };

    expect(matches(arbOneFilter, ChainId.Ethereum, ChainId.ArbitrumOne)).toBe(true);
    expect(matches(arbOneFilter, ChainId.ArbitrumOne, ChainId.RobinhoodChain)).toBe(true);
    // core <> longtail routes stay excluded, keeping the selection indexed
    expect(matches(arbOneFilter, ChainId.ArbitrumOne, ChainId.ApeChain)).toBe(false);
    // routes between other core chains are excluded
    expect(matches(arbOneFilter, ChainId.Ethereum, ChainId.ArbitrumNova)).toBe(false);
  });

  it('a multi-chain core-chains filter matches routes touching any selected chain', () => {
    const arbOneAndNovaFilter: TxHistoryChainFilter = {
      type: 'core-chains',
      chainIds: [ChainId.ArbitrumOne, ChainId.ArbitrumNova],
      coreChainIds,
    };

    expect(matches(arbOneAndNovaFilter, ChainId.Ethereum, ChainId.ArbitrumOne)).toBe(true);
    expect(matches(arbOneAndNovaFilter, ChainId.Ethereum, ChainId.ArbitrumNova)).toBe(true);
    expect(matches(arbOneAndNovaFilter, ChainId.ArbitrumOne, ChainId.ArbitrumNova)).toBe(true);
    // routes between other core chains are excluded
    expect(matches(arbOneAndNovaFilter, ChainId.Ethereum, ChainId.RobinhoodChain)).toBe(false);
    // core <> longtail routes stay excluded
    expect(matches(arbOneAndNovaFilter, ChainId.ArbitrumOne, ChainId.ApeChain)).toBe(false);
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
