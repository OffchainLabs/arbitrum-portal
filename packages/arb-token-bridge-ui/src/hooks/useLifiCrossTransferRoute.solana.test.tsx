import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { useLifiCrossTransfersRoute } from './useLifiCrossTransferRoute';

const sender = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
const recipient = '0x1111111111111111111111111111111111111111';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe.sequential('Solana quote recipient boundary', () => {
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
