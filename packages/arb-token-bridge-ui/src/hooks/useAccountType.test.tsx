import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWalletTestWrapper } from '../test-utils/wallet-test-wrapper';
import { ChainId } from '../types/ChainId';
import { getAccountType } from '../util/AccountUtils';
import { defaultWalletContextValue } from '../wallet/WalletContext';
import { useAccountType } from './useAccountType';

vi.mock('../util/AccountUtils', () => ({ getAccountType: vi.fn(async () => undefined) }));
vi.mock('../util/featureFlag', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../util/featureFlag')>()),
  isSolanaEnabled: () => true,
  isLifiEnabled: () => true,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe.sequential('useAccountType', () => {
  it.each([
    { sourceChain: ChainId.Ethereum, address: '0x1111111111111111111111111111111111111111' },
    { sourceChain: ChainId.Solana, address: 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5' },
  ])('uses the source wallet for $sourceChain', async ({ sourceChain, address }) => {
    const wrapper = createWalletTestWrapper({
      query: { sourceChain, destinationChain: ChainId.ArbitrumOne },
      wallets: {
        evm: {
          ...defaultWalletContextValue.evm,
          account: {
            ecosystem: 'evm',
            status: 'connected',
            address: '0x1111111111111111111111111111111111111111',
          },
        },
        solana: {
          ...defaultWalletContextValue.solana,
          account: {
            ecosystem: 'solana',
            status: 'connected',
            address: 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
          },
        },
      },
    });
    renderHook(() => useAccountType(), { wrapper });
    await waitFor(() =>
      expect(getAccountType).toHaveBeenCalledWith({ address, chainId: sourceChain }),
    );
  });

  it('uses explicit account and chain overrides and follows address changes', async () => {
    const wrapper = createWalletTestWrapper({
      query: { sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne },
      wallets: defaultWalletContextValue,
    });
    const { rerender } = renderHook(({ address }) => useAccountType(address, ChainId.ArbitrumOne), {
      wrapper,
      initialProps: { address: '0x1111111111111111111111111111111111111111' },
    });
    await waitFor(() =>
      expect(getAccountType).toHaveBeenLastCalledWith({
        address: '0x1111111111111111111111111111111111111111',
        chainId: ChainId.ArbitrumOne,
      }),
    );
    rerender({ address: '0x2222222222222222222222222222222222222222' });
    await waitFor(() =>
      expect(getAccountType).toHaveBeenLastCalledWith({
        address: '0x2222222222222222222222222222222222222222',
        chainId: ChainId.ArbitrumOne,
      }),
    );
  });

  it('does not probe a disconnected wallet', () => {
    const wrapper = createWalletTestWrapper({
      query: { sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne },
      wallets: defaultWalletContextValue,
    });
    const { result } = renderHook(() => useAccountType(), { wrapper });
    expect(result.current.accountType).toBeUndefined();
    expect(getAccountType).not.toHaveBeenCalled();
  });
});
