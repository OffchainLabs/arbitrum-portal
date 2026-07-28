import { beforeEach, describe, expect, it } from 'vitest';

import { ChainId } from '../../../types/ChainId';
import { useTransactionHistoryChainFilterStore } from '../useTransactionHistoryChainFilterStore';

describe('useTransactionHistoryChainFilterStore', () => {
  beforeEach(() => {
    useTransactionHistoryChainFilterStore.setState({
      selection: null,
      selectionDefaultChainId: undefined,
    });
  });

  it('starts with no selection, meaning the filter defaults to All Core Chains', () => {
    expect(useTransactionHistoryChainFilterStore.getState().selection).toBeNull();
  });

  it('setSelection stores the chains along with the mode they were selected in', () => {
    useTransactionHistoryChainFilterStore
      .getState()
      .setSelection({ chainIds: [ChainId.ArbitrumOne, ChainId.Ethereum], isTestnetMode: false });

    expect(useTransactionHistoryChainFilterStore.getState().selection).toEqual({
      chainIds: [ChainId.ArbitrumOne, ChainId.Ethereum],
      isTestnetMode: false,
    });
  });

  it('setSelection replaces the previous selection', () => {
    const { setSelection } = useTransactionHistoryChainFilterStore.getState();
    setSelection({ chainIds: [ChainId.ArbitrumOne], isTestnetMode: false });
    setSelection({ chainIds: null, isTestnetMode: false });

    expect(useTransactionHistoryChainFilterStore.getState().selection).toEqual({
      chainIds: null,
      isTestnetMode: false,
    });
  });

  it('setSelection records the pair default it was made under, replacing the previous one', () => {
    const { setSelection } = useTransactionHistoryChainFilterStore.getState();

    setSelection({ chainIds: [ChainId.ArbitrumOne], isTestnetMode: false }, ChainId.ArbitrumNova);
    expect(useTransactionHistoryChainFilterStore.getState().selectionDefaultChainId).toBe(
      ChainId.ArbitrumNova,
    );

    setSelection({ chainIds: [ChainId.ArbitrumOne], isTestnetMode: false });
    expect(
      useTransactionHistoryChainFilterStore.getState().selectionDefaultChainId,
    ).toBeUndefined();
  });
});
