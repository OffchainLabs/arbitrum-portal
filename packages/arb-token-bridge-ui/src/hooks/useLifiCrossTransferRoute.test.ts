import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLifiCrossTransfersRoute } from './useLifiCrossTransferRoute';

vi.mock('swr', () => ({
  default: vi.fn(),
}));

const parameters = {
  fromAmount: '1',
  fromToken: '0x0000000000000000000000000000000000000001',
  toToken: '0x0000000000000000000000000000000000000002',
  fromChainId: 1,
  toChainId: 4663,
  fromAddress: undefined,
  toAddress: undefined,
  denyBridges: [],
  denyExchanges: [],
  slippage: '0.5',
};

describe('useLifiCrossTransfersRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps previous route data while loading and clears it when the replacement request errors', () => {
    const previousRoutes = [{ id: 'previous-route' }];
    let swrResult = {
      data: previousRoutes,
      error: undefined,
      isLoading: false,
    } as ReturnType<typeof useSWR>;
    vi.mocked(useSWR).mockImplementation(() => swrResult);

    const { result, rerender } = renderHook(
      ({ fromToken }) => useLifiCrossTransfersRoute({ ...parameters, fromToken }),
      { initialProps: { fromToken: parameters.fromToken } },
    );

    expect(result.current.data).toBe(previousRoutes);

    swrResult = {
      data: previousRoutes,
      error: undefined,
      isLoading: true,
    } as ReturnType<typeof useSWR>;
    rerender({ fromToken: '0x0000000000000000000000000000000000000003' });

    expect(result.current.data).toBe(previousRoutes);

    const error = new Error('LiFi request failed');
    swrResult = {
      data: previousRoutes,
      error,
      isLoading: false,
    } as ReturnType<typeof useSWR>;
    rerender({ fromToken: '0x0000000000000000000000000000000000000003' });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBe(error);
  });
});
