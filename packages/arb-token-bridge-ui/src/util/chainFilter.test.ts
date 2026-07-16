import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { isChainFilterActive, matchesChainFilter, resolveSelectedChainIds } from './chainFilter';

function matches(
  selectedChainIds: number[],
  sourceChainId: number,
  destinationChainId: number,
): boolean {
  return matchesChainFilter({ selectedChainIds, sourceChainId, destinationChainId });
}

describe('isChainFilterActive', () => {
  it('is inactive when nothing is selected (the "All Chains" state)', () => {
    expect(isChainFilterActive([])).toBe(false);
  });

  it('is active when one or more chains are selected', () => {
    expect(isChainFilterActive([ChainId.Ethereum])).toBe(true);
    expect(isChainFilterActive([ChainId.Ethereum, ChainId.ArbitrumOne])).toBe(true);
  });
});

describe('resolveSelectedChainIds', () => {
  const defaultChainIds = [ChainId.ArbitrumOne];

  it('falls back to the bridge default until the user makes a selection', () => {
    expect(
      resolveSelectedChainIds({ selection: null, isTestnetMode: false, defaultChainIds }),
    ).toEqual(defaultChainIds);
  });

  it('uses the user selection when it was made in the current testnet mode', () => {
    expect(
      resolveSelectedChainIds({
        selection: { chainIds: [ChainId.Ethereum], isTestnetMode: false },
        isTestnetMode: false,
        defaultChainIds,
      }),
    ).toEqual([ChainId.Ethereum]);
  });

  it('keeps an explicit "All Chains" (empty) selection', () => {
    expect(
      resolveSelectedChainIds({
        selection: { chainIds: [], isTestnetMode: false },
        isTestnetMode: false,
        defaultChainIds,
      }),
    ).toEqual([]);
  });

  it('re-defaults when the selection was made in the other testnet mode', () => {
    // e.g. the user filtered on mainnet, then switched to testnet: the mainnet
    // chains don't exist there, so the filter re-defaults to the new mode's chains
    expect(
      resolveSelectedChainIds({
        selection: { chainIds: [ChainId.Ethereum], isTestnetMode: false },
        isTestnetMode: true,
        defaultChainIds: [ChainId.ArbitrumSepolia],
      }),
    ).toEqual([ChainId.ArbitrumSepolia]);
  });
});

describe('matchesChainFilter', () => {
  it('matches everything when the filter is inactive (All Chains)', () => {
    expect(matches([], ChainId.Ethereum, ChainId.ArbitrumOne)).toBe(true);
    expect(matches([], ChainId.ArbitrumOne, ChainId.RobinhoodChain)).toBe(true);
  });

  it('matches when either endpoint is selected, in either direction', () => {
    expect(matches([ChainId.Ethereum], ChainId.Ethereum, ChainId.ArbitrumOne)).toBe(true);
    expect(matches([ChainId.Ethereum], ChainId.ArbitrumOne, ChainId.Ethereum)).toBe(true);
    // selecting a hub chain shows every route touching it
    expect(matches([ChainId.ArbitrumOne], ChainId.ArbitrumOne, ChainId.RobinhoodChain)).toBe(true);
    // an Orbit chain is scoped to its own routes
    expect(matches([ChainId.RobinhoodChain], ChainId.ArbitrumOne, ChainId.RobinhoodChain)).toBe(
      true,
    );
  });

  it('does not match when no selected chain is an endpoint', () => {
    expect(matches([ChainId.Ethereum], ChainId.ArbitrumOne, ChainId.RobinhoodChain)).toBe(false);
    expect(
      matches([ChainId.Base, ChainId.RobinhoodChain], ChainId.Ethereum, ChainId.ArbitrumOne),
    ).toBe(false);
  });
});
