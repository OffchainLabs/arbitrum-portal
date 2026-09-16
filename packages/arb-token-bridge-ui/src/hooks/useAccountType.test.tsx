import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { getAccountType } from '../util/AccountUtils';
import { WalletContext, defaultWalletContextValue } from '../wallet/WalletContext';
import { useAccountType } from './useAccountType';

const selection = vi.hoisted(() => ({ sourceChain: { id: 1 } }));
vi.mock('./useNetworks', () => ({ useNetworks: () => [selection] }));
vi.mock('../util/AccountUtils', () => ({ getAccountType: vi.fn(async () => undefined) }));

describe.sequential('useAccountType wallet inputs', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('does not throw during render for an unsupported connected-chain override', () => {
    selection.sourceChain.id = ChainId.Ethereum;
    const { result } = renderHook(() => useAccountType(undefined, 999_999_999));
    expect(result.current.accountType).toBeUndefined();
  });

  it('inspects the selected account from injected context and follows account changes', async () => {
    selection.sourceChain.id = ChainId.Solana;
    let evmAddress = '0x1111111111111111111111111111111111111111';
    const solanaAddress = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
    function Wrapper({ children }: PropsWithChildren) {
      return (
        <SWRConfig value={{ provider: () => new Map() }}>
          <WalletContext.Provider
            value={{
              evm: {
                ...defaultWalletContextValue.evm,
                account: { ecosystem: 'evm', address: evmAddress, status: 'connected' },
                isConnected: true,
              },
              solana: {
                ...defaultWalletContextValue.solana,
                account: { ecosystem: 'solana', address: solanaAddress, status: 'connected' },
                isConnected: true,
              },
            }}
          >
            {children}
          </WalletContext.Provider>
        </SWRConfig>
      );
    }
    const { rerender } = renderHook(() => useAccountType(), { wrapper: Wrapper });
    await waitFor(() =>
      expect(getAccountType).toHaveBeenCalledWith({
        address: solanaAddress,
        chainId: ChainId.Solana,
      }),
    );
    selection.sourceChain.id = ChainId.Ethereum;
    rerender();
    await waitFor(() =>
      expect(getAccountType).toHaveBeenLastCalledWith({
        address: evmAddress,
        chainId: ChainId.Ethereum,
      }),
    );
    evmAddress = '0x2222222222222222222222222222222222222222';
    rerender();
    await waitFor(() =>
      expect(getAccountType).toHaveBeenLastCalledWith({
        address: evmAddress,
        chainId: ChainId.Ethereum,
      }),
    );
  });
});
