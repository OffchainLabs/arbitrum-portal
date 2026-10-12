import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as nativeCurrencyService from '../services/nativeCurrency';
import { createWalletTestWrapper } from '../test-utils/wallet-test-wrapper';
import { ChainId } from '../types/ChainId';
import { useNativeCurrency } from './useNativeCurrency';

describe.sequential('useNativeCurrency', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('reads the native currency by chain id', async () => {
    const customCurrency = {
      name: 'ApeCoin',
      symbol: 'APE',
      decimals: 18,
      isCustom: true as const,
      address: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
    };
    vi.spyOn(nativeCurrencyService, 'fetchNativeCurrency').mockResolvedValue(customCurrency);
    const wrapper = createWalletTestWrapper({
      query: { sourceChain: ChainId.Ethereum, destinationChain: ChainId.ApeChain },
    });
    const { result } = renderHook(() => useNativeCurrency({ chainId: ChainId.ApeChain }), {
      wrapper,
    });
    await waitFor(() => expect(result.current).toEqual(customCurrency));
    expect(nativeCurrencyService.fetchNativeCurrency).toHaveBeenCalledWith({
      chainId: ChainId.ApeChain,
      parentChainIdFromQueryParam: ChainId.Ethereum,
    });
  });
});
