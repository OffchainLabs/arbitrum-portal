import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { useLifiCrossTransfersRoute } from './useLifiCrossTransferRoute';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const sender = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
const recipient = '0x1111111111111111111111111111111111111111';

describe.sequential('Solana quote recipient boundary', () => {
  it.each([ChainId.ArbitrumOne, ChainId.ApeChain, ChainId.Superposition])(
    'quotes %s anonymously and preserves a valid explicit recipient',
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
      await waitFor(() => expect(fetchRoute).toHaveBeenCalledOnce());
      const anonymousUrl = new URL(String(fetchRoute.mock.calls[0]?.[0]), 'http://localhost');
      expect(anonymousUrl.searchParams.has('toAddress')).toBe(false);
      rerender({ toAddress: sender });
      expect(result.current.data).toBeUndefined();
      expect(fetchRoute).toHaveBeenCalledOnce();
      rerender({ toAddress: recipient });
      await waitFor(() => expect(fetchRoute).toHaveBeenCalledTimes(2));
      const url = new URL(String(fetchRoute.mock.calls[1]?.[0]), 'http://localhost');
      expect(url.searchParams.get('fromAddress')).toBe(sender);
      expect(url.searchParams.get('toAddress')).toBe(recipient);
      expect(url.searchParams.get('fromAmount')).toBe('1000000000');
      rerender({ toAddress: undefined });
      await waitFor(() => expect(result.current.data).toEqual([]));
    },
  );

  it('re-quotes with the Solana sender after the wallet connects', async () => {
    const fetchRoute = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchRoute);
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
    );
    const initialProps: { fromAddress: string | undefined } = { fromAddress: undefined };
    const { rerender } = renderHook(
      ({ fromAddress }: { fromAddress: string | undefined }) =>
        useLifiCrossTransfersRoute({
          fromChainId: ChainId.Solana,
          toChainId: ChainId.ArbitrumOne,
          fromAddress,
          toAddress: recipient,
          fromToken: '11111111111111111111111111111111',
          toToken: '0x0000000000000000000000000000000000000000',
          fromAmount: '1000000000',
        }),
      { initialProps, wrapper },
    );

    await waitFor(() => expect(fetchRoute).toHaveBeenCalledOnce());
    const disconnectedUrl = new URL(String(fetchRoute.mock.calls[0]?.[0]), 'http://localhost');
    expect(disconnectedUrl.searchParams.has('fromAddress')).toBe(false);

    rerender({ fromAddress: sender });
    await waitFor(() => expect(fetchRoute).toHaveBeenCalledTimes(2));
    const connectedUrl = new URL(String(fetchRoute.mock.calls[1]?.[0]), 'http://localhost');
    expect(connectedUrl.searchParams.get('fromAddress')).toBe(sender);
  });
});
