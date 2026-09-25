import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import useSWR, { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { useLifiCrossTransfersRoute } from './useLifiCrossTransferRoute';

vi.mock('swr', async (importOriginal) => ({
  ...(await importOriginal<typeof import('swr')>()),
  default: vi.fn(),
}));

const parameters = {
  fromAmount: '1',
  fromToken: '0x0000000000000000000000000000000000000001',
  toToken: '0x0000000000000000000000000000000000000002',
  fromChainId: 1,
  toChainId: 42161,
  fromAddress: '0x1111111111111111111111111111111111111111',
  toAddress: '0x2222222222222222222222222222222222222222',
  denyBridges: [],
  denyExchanges: [],
  slippage: '0.5',
};

describe.sequential('useLifiCrossTransfersRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSWR).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    });
  });

  it.each([
    { fromAddress: undefined },
    { toAddress: undefined },
    { toAddress: 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5' },
    { toAddress: '0x52908400098527886e0F7030069857D2E4169EE7' },
  ])('does not request routes with invalid account inputs: %s', (overrides) => {
    const { result } = renderHook(() =>
      useLifiCrossTransfersRoute({ ...parameters, ...overrides }),
    );
    expect(vi.mocked(useSWR).mock.calls.at(-1)?.[0]).toBeNull();
    expect(result.current.data).toBeUndefined();
  });

  it('accepts an explicit valid recipient without a destination session', () => {
    renderHook(() => useLifiCrossTransfersRoute(parameters));
    expect(vi.mocked(useSWR).mock.calls.at(-1)?.[0]).toEqual(
      expect.arrayContaining([parameters.fromAddress, parameters.toAddress]),
    );
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

const sender = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
const recipient = '0x1111111111111111111111111111111111111111';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe.sequential('Solana quote recipient boundary', () => {
  beforeEach(async () => {
    const actual = await vi.importActual<typeof import('swr')>('swr');
    vi.mocked(useSWR).mockImplementation(actual.default);
  });

  it.each([ChainId.ArbitrumOne, ChainId.ApeChain, ChainId.Superposition])(
    'requests %s only after a valid recipient is present',
    async (toChainId) => {
      const fetchRoute = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      vi.stubGlobal('fetch', fetchRoute);
      const cache = new Map();

      const wrapper = ({ children }: PropsWithChildren) => (
        <SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>{children}</SWRConfig>
      );

      const initialProps: { toAddress: string | undefined } = { toAddress: undefined };
      const { result, rerender } = renderHook(
        ({ toAddress }: { toAddress: string | undefined }) =>
          useLifiCrossTransfersRoute({
            fromChainId: ChainId.Solana,
            toChainId,
            fromAddress: sender,
            toAddress,
            fromToken: '11111111111111111111111111111111',
            toToken: '0x0000000000000000000000000000000000000000',
            fromAmount: '1000000000',
          }),
        { initialProps, wrapper },
      );
      expect(fetchRoute).not.toHaveBeenCalled();
      rerender({ toAddress: sender });
      expect(fetchRoute).not.toHaveBeenCalled();
      rerender({ toAddress: recipient });
      await waitFor(() => expect(result.current.data).toEqual([]));
      const url = new URL(String(fetchRoute.mock.calls[0]?.[0]), 'http://localhost');
      expect(url.searchParams.get('fromAddress')).toBe(sender);
      expect(url.searchParams.get('toAddress')).toBe(recipient);
      expect(url.searchParams.get('fromAmount')).toBe('1000000000');
      rerender({ toAddress: undefined });
      expect(result.current.data).toBeUndefined();
      expect(fetchRoute).toHaveBeenCalledOnce();
    },
  );
});
