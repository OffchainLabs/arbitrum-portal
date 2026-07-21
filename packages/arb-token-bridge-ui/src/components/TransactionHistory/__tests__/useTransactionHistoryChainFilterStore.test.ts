import { beforeEach, describe, expect, it } from 'vitest';

import { ChainId } from '../../../types/ChainId';
import { useTransactionHistoryChainFilterStore } from '../useTransactionHistoryChainFilterStore';

describe('useTransactionHistoryChainFilterStore', () => {
  beforeEach(() => {
    useTransactionHistoryChainFilterStore.setState({ selection: null });
  });

  it('starts with no selection, meaning the filter follows the bridge default', () => {
    expect(useTransactionHistoryChainFilterStore.getState().selection).toBeNull();
  });

  it('setSelection stores the chains along with the mode they were selected in', () => {
    useTransactionHistoryChainFilterStore
      .getState()
      .setSelection({ chainIds: [ChainId.Ethereum, ChainId.ArbitrumOne], isTestnetMode: false });

    expect(useTransactionHistoryChainFilterStore.getState().selection).toEqual({
      chainIds: [ChainId.Ethereum, ChainId.ArbitrumOne],
      isTestnetMode: false,
    });
  });

  it('setSelection replaces the previous selection', () => {
    const { setSelection } = useTransactionHistoryChainFilterStore.getState();
    setSelection({ chainIds: [ChainId.Ethereum], isTestnetMode: false });
    setSelection({ chainIds: [], isTestnetMode: false });

    expect(useTransactionHistoryChainFilterStore.getState().selection).toEqual({
      chainIds: [],
      isTestnetMode: false,
    });
  });
});
