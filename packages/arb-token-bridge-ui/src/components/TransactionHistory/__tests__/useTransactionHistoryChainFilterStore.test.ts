import { beforeEach, describe, expect, it } from 'vitest';

import { ChainId } from '../../../types/ChainId';
import {
  isChainFilterActive,
  matchesChainFilter,
  useTransactionHistoryChainFilterStore,
} from '../useTransactionHistoryChainFilterStore';

// A canonical bridge route is a pair of chains. Helper to keep assertions terse.
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
  it('matches every transaction when the filter is inactive (All Chains)', () => {
    expect(matches([], ChainId.Ethereum, ChainId.ArbitrumOne)).toBe(true);
    expect(matches([], ChainId.ArbitrumOne, ChainId.RobinhoodChain)).toBe(true);
  });

  describe('single chain selected (matches either endpoint)', () => {
    it('matches when the chain is the source', () => {
      expect(matches([ChainId.Ethereum], ChainId.Ethereum, ChainId.ArbitrumOne)).toBe(true);
    });

    it('matches when the chain is the destination', () => {
      // withdrawal Arbitrum One -> Ethereum
      expect(matches([ChainId.Ethereum], ChainId.ArbitrumOne, ChainId.Ethereum)).toBe(true);
    });

    it('does not match when the chain is neither endpoint', () => {
      expect(matches([ChainId.Ethereum], ChainId.ArbitrumOne, ChainId.RobinhoodChain)).toBe(false);
    });

    it('scopes an Orbit chain to just its route', () => {
      expect(matches([ChainId.RobinhoodChain], ChainId.ArbitrumOne, ChainId.RobinhoodChain)).toBe(
        true,
      );
      expect(matches([ChainId.RobinhoodChain], ChainId.Ethereum, ChainId.ArbitrumOne)).toBe(false);
    });
  });

  describe('multiple chains selected (both endpoints must be selected)', () => {
    const selection = [ChainId.Ethereum, ChainId.ArbitrumOne];

    it('matches a route whose both endpoints are selected, in either direction', () => {
      // deposit Ethereum -> Arbitrum One
      expect(matches(selection, ChainId.Ethereum, ChainId.ArbitrumOne)).toBe(true);
      // withdrawal Arbitrum One -> Ethereum
      expect(matches(selection, ChainId.ArbitrumOne, ChainId.Ethereum)).toBe(true);
    });

    it('does not match when only one endpoint is selected (hub breadth is excluded)', () => {
      // Arbitrum One is selected but Robinhood is not -> excluded
      expect(matches(selection, ChainId.ArbitrumOne, ChainId.RobinhoodChain)).toBe(false);
      // Ethereum is selected but Base is not -> excluded
      expect(matches(selection, ChainId.Ethereum, ChainId.Base)).toBe(false);
    });

    it('does not match when neither endpoint is selected', () => {
      expect(matches(selection, ChainId.Base, ChainId.RobinhoodChain)).toBe(false);
    });

    it('matches routes among three selected chains and excludes routes leaving the set', () => {
      const three = [ChainId.Ethereum, ChainId.ArbitrumOne, ChainId.RobinhoodChain];
      expect(matches(three, ChainId.Ethereum, ChainId.ArbitrumOne)).toBe(true);
      expect(matches(three, ChainId.ArbitrumOne, ChainId.RobinhoodChain)).toBe(true);
      // Arbitrum One -> Base leaves the selected set
      expect(matches(three, ChainId.ArbitrumOne, ChainId.Base)).toBe(false);
    });

    it('excludes sibling leaves with no shared endpoint in the selection', () => {
      // Robinhood and another Orbit chain both settle to Arbitrum One, which
      // is not selected here, so there is no route fully within the selection.
      expect(
        matches([ChainId.RobinhoodChain, ChainId.Base], ChainId.ArbitrumOne, ChainId.Base),
      ).toBe(false);
    });
  });
});

describe('useTransactionHistoryChainFilterStore', () => {
  beforeEach(() => {
    useTransactionHistoryChainFilterStore.setState({
      selectedChainIds: [],
      hasUserModified: false,
    });
  });

  it('defaults to All Chains with no user modification', () => {
    const state = useTransactionHistoryChainFilterStore.getState();
    expect(state.selectedChainIds).toEqual([]);
    expect(state.hasUserModified).toBe(false);
  });

  it('setSelectedChainIds replaces the selection and marks it user-modified', () => {
    useTransactionHistoryChainFilterStore
      .getState()
      .setSelectedChainIds([ChainId.Ethereum, ChainId.ArbitrumOne]);

    const state = useTransactionHistoryChainFilterStore.getState();
    expect(state.selectedChainIds).toEqual([ChainId.Ethereum, ChainId.ArbitrumOne]);
    expect(state.hasUserModified).toBe(true);
  });

  it('toggleChainId adds then removes a chain and marks it user-modified', () => {
    const { toggleChainId } = useTransactionHistoryChainFilterStore.getState();

    toggleChainId(ChainId.ArbitrumOne);
    expect(useTransactionHistoryChainFilterStore.getState().selectedChainIds).toEqual([
      ChainId.ArbitrumOne,
    ]);
    expect(useTransactionHistoryChainFilterStore.getState().hasUserModified).toBe(true);

    toggleChainId(ChainId.ArbitrumOne);
    expect(useTransactionHistoryChainFilterStore.getState().selectedChainIds).toEqual([]);
  });

  it('clearSelectedChainIds resets to All Chains but keeps it user-modified', () => {
    const store = useTransactionHistoryChainFilterStore.getState();
    store.setSelectedChainIds([ChainId.Ethereum]);
    store.clearSelectedChainIds();

    const state = useTransactionHistoryChainFilterStore.getState();
    expect(state.selectedChainIds).toEqual([]);
    expect(state.hasUserModified).toBe(true);
  });

  describe('initializeFromBridgeChains', () => {
    it('sets the default selection when the user has not modified the filter', () => {
      useTransactionHistoryChainFilterStore
        .getState()
        .initializeFromBridgeChains([ChainId.ArbitrumOne, ChainId.RobinhoodChain]);

      expect(useTransactionHistoryChainFilterStore.getState().selectedChainIds).toEqual([
        ChainId.ArbitrumOne,
        ChainId.RobinhoodChain,
      ]);
      // initializing from the bridge is not a user modification
      expect(useTransactionHistoryChainFilterStore.getState().hasUserModified).toBe(false);
    });

    it('does not override an explicit user selection', () => {
      const store = useTransactionHistoryChainFilterStore.getState();
      store.setSelectedChainIds([ChainId.Ethereum]);
      store.initializeFromBridgeChains([ChainId.ArbitrumOne, ChainId.RobinhoodChain]);

      expect(useTransactionHistoryChainFilterStore.getState().selectedChainIds).toEqual([
        ChainId.Ethereum,
      ]);
    });

    it('re-initializes after the selection was reset (e.g. on testnet toggle)', () => {
      const store = useTransactionHistoryChainFilterStore.getState();
      store.setSelectedChainIds([ChainId.Ethereum]);
      // clearing keeps hasUserModified true, so a plain re-init would be ignored
      store.clearSelectedChainIds();
      store.initializeFromBridgeChains([ChainId.ArbitrumOne]);
      // still respects the user modification
      expect(useTransactionHistoryChainFilterStore.getState().selectedChainIds).toEqual([]);
    });
  });
});
