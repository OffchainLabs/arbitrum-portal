import { beforeEach, describe, expect, it } from 'vitest';

import { ChainId } from '../../../types/ChainId';
import { useTransactionHistoryChainFilterStore } from '../useTransactionHistoryChainFilterStore';

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
