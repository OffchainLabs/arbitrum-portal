import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWalletTestWrapper } from '../test-utils/wallet-test-wrapper';
import { useNativeCurrency } from './useNativeCurrency';

vi.mock('../services/nativeCurrency', () => ({
  fetchNativeCurrency: vi.fn(async () => {
    throw new Error('Unknown chain');
  }),
}));
afterEach(cleanup);

describe('historical native currency metadata', () => {
  it('keeps unknown chain records renderable when metadata cannot be fetched', () => {
    const wrapper = createWalletTestWrapper({
      query: { sourceChain: 1, destinationChain: 42161 },
    });
    const { result } = renderHook(() => useNativeCurrency({ chainId: 999_999_999 }), { wrapper });
    expect(result.current).toMatchObject({
      name: 'Native currency',
      symbol: 'Unknown',
      isCustom: false,
    });
  });

  it('retains known native currency metadata while loading', () => {
    const wrapper = createWalletTestWrapper({
      query: { sourceChain: 1, destinationChain: 42161 },
    });
    const { result } = renderHook(() => useNativeCurrency({ chainId: 1 }), { wrapper });
    expect(result.current).toMatchObject({ symbol: 'ETH', decimals: 18 });
  });
});
