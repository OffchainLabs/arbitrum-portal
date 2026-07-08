import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { isChainFilterActive, matchesChainFilter } from './chainFilter';

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
