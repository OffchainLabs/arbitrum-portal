import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { type PropsWithChildren, createElement } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useLifiCrossTransfersRoute } from './useLifiCrossTransferRoute';

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

function createWrapper() {
  const cache = new Map();
  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(
      SWRConfig,
      { value: { provider: () => cache, dedupingInterval: 0, shouldRetryOnError: false } },
      children,
    );
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe.sequential('useLifiCrossTransfersRoute', () => {
  it.each([
    { fromAddress: 'not-an-address' },
    { toAddress: undefined },
    { toAddress: 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5' },
    { toAddress: '0x52908400098527886e0F7030069857D2E4169EE7' },
  ])('does not request routes with invalid account inputs: %s', async (overrides) => {
    const fetchRoute = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchRoute);
    const { result } = renderHook(
      () => useLifiCrossTransfersRoute({ ...parameters, ...overrides }),
      { wrapper: createWrapper() },
    );
    await act(async () => {});
    expect(fetchRoute).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('accepts an explicit valid recipient without a destination session', async () => {
    const fetchRoute = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchRoute);
    const { result, rerender } = renderHook(
      ({ toAddress }) => useLifiCrossTransfersRoute({ ...parameters, toAddress }),
      {
        wrapper: createWrapper(),
        initialProps: { toAddress: parameters.toAddress as string | undefined },
      },
    );
    await waitFor(() => expect(result.current.data).toEqual([]));
    const url = new URL(String(fetchRoute.mock.calls[0]?.[0]), 'http://localhost');
    expect(url.searchParams.get('fromAddress')).toBe(parameters.fromAddress);
    expect(url.searchParams.get('toAddress')).toBe(parameters.toAddress);
    rerender({ toAddress: undefined });
    expect(result.current.data).toBeUndefined();
    expect(fetchRoute).toHaveBeenCalledOnce();
  });

  it('keeps previous routes while loading and clears them when the replacement fails', async () => {
    const previousRoutes = [{ id: 'previous-route' }];
    let failRequest: (reason: Error) => void = () => {
      throw new Error('Replacement request has not started');
    };
    const replacement = new Promise<Response>((_resolve, reject) => {
      failRequest = reject;
    });
    const fetchRoute = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: previousRoutes }), { status: 200 }),
      )
      .mockReturnValueOnce(replacement);
    vi.stubGlobal('fetch', fetchRoute);
    const { result, rerender } = renderHook(
      ({ fromToken }) => useLifiCrossTransfersRoute({ ...parameters, fromToken }),
      {
        wrapper: createWrapper(),
        initialProps: { fromToken: parameters.fromToken },
      },
    );
    await waitFor(() => expect(result.current.data).toEqual(previousRoutes));
    rerender({ fromToken: '0x0000000000000000000000000000000000000003' });
    await waitFor(() => expect(fetchRoute).toHaveBeenCalledTimes(2));
    expect(result.current.data).toEqual(previousRoutes);
    const error = new Error('LiFi request failed');
    await act(async () => failRequest(error));
    await waitFor(() => expect(result.current.data).toBeUndefined());
    expect(result.current.error).toBe(error);
  });
});
