import { beforeEach, describe, expect, it } from 'vitest';

import { ChainId } from '../../../types/ChainId';
import { useTransactionHistoryChainFilterStore } from '../useTransactionHistoryChainFilterStore';

describe('useTransactionHistoryChainFilterStore', () => {
  beforeEach(() => {
    useTransactionHistoryChainFilterStore.setState({ selection: null });
  });

  it('starts with no selection, meaning the filter defaults to All Core Chains', () => {
    expect(useTransactionHistoryChainFilterStore.getState().selection).toBeNull();
  });

  it('setSelection stores the chain along with the mode it was selected in', () => {
    useTransactionHistoryChainFilterStore
      .getState()
      .setSelection({ chainId: ChainId.ArbitrumOne, isTestnetMode: false });

    expect(useTransactionHistoryChainFilterStore.getState().selection).toEqual({
      chainId: ChainId.ArbitrumOne,
      isTestnetMode: false,
    });
  });

  it('setSelection replaces the previous selection', () => {
    const { setSelection } = useTransactionHistoryChainFilterStore.getState();
    setSelection({ chainId: ChainId.ArbitrumOne, isTestnetMode: false });
    setSelection({ chainId: null, isTestnetMode: false });

    expect(useTransactionHistoryChainFilterStore.getState().selection).toEqual({
      chainId: null,
      isTestnetMode: false,
    });
  });
});
