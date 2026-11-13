import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWalletTestWrapper } from '../test-utils/wallet-test-wrapper';
import { ChainId } from '../types/ChainId';
import { getAccountType } from '../util/AccountUtils';
import type { SolanaAddress } from '../util/AddressUtils';
import { defaultWalletContextValue } from '../wallet/WalletContext';
import { useAccountType } from './useAccountType';

vi.mock('../util/AccountUtils', () => ({ getAccountType: vi.fn(async () => undefined) }));
vi.mock('../wallet/ecosystems/solana', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../wallet/ecosystems/solana')>();
  actual.solanaEcosystem.isEnabled = () => true;
  return actual;
});

const query = { sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne };
// The Solana network isn't configured yet, so the route can't come from the query
const route = vi.hoisted(() => ({ sourceChainId: 0, destinationChainId: 0 }));
vi.mock('./useNetworks', () => ({
  useNetworks: () => [
    {
      sourceChain: { id: route.sourceChainId },
      destinationChain: { id: route.destinationChainId },
    },
  ],
}));

const evmAddress = '0x1111111111111111111111111111111111111111';
const solanaAddress = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5' as SolanaAddress;

beforeEach(() => {
  route.sourceChainId = ChainId.Ethereum;
  route.destinationChainId = ChainId.ArbitrumOne;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe.sequential('useAccountType', () => {
  it('inspects the source wallet on the source chain', async () => {
    const address = '0x1111111111111111111111111111111111111111';
    const wrapper = createWalletTestWrapper({
      query,
      wallets: {
        ...defaultWalletContextValue,
        evm: {
          ...defaultWalletContextValue.evm,
          account: { ecosystem: 'evm', status: 'connected', address },
        },
      },
    });
    renderHook(() => useAccountType(), { wrapper });
    await waitFor(() =>
      expect(getAccountType).toHaveBeenCalledWith({ address, chainId: ChainId.Ethereum }),
    );
  });

  describe('on a Solana to Arbitrum One route', () => {
    beforeEach(() => {
      route.sourceChainId = ChainId.Solana;
    });

    it('inspects the Solana source wallet on Solana', async () => {
      const wrapper = createWalletTestWrapper({
        query,
        wallets: {
          ...defaultWalletContextValue,
          solana: {
            ...defaultWalletContextValue.solana,
            account: { ecosystem: 'solana', status: 'connected', address: solanaAddress },
          },
        },
      });
      renderHook(() => useAccountType(), { wrapper });
      await waitFor(() =>
        expect(getAccountType).toHaveBeenCalledWith({
          address: solanaAddress,
          chainId: ChainId.Solana,
        }),
      );
    });

    it('inspects an EVM address on the EVM chain of the route', async () => {
      const wrapper = createWalletTestWrapper({ query, wallets: defaultWalletContextValue });
      renderHook(() => useAccountType(evmAddress), { wrapper });
      await waitFor(() =>
        expect(getAccountType).toHaveBeenCalledWith({
          address: evmAddress,
          chainId: ChainId.ArbitrumOne,
        }),
      );
    });

    it('inspects an EVM address on the requested chain', async () => {
      const wrapper = createWalletTestWrapper({ query, wallets: defaultWalletContextValue });
      renderHook(() => useAccountType(evmAddress, ChainId.Ethereum), { wrapper });
      await waitFor(() =>
        expect(getAccountType).toHaveBeenCalledWith({
          address: evmAddress,
          chainId: ChainId.Ethereum,
        }),
      );
    });
  });

  it('does not inspect a disconnected wallet', () => {
    const wrapper = createWalletTestWrapper({ query, wallets: defaultWalletContextValue });
    const { result } = renderHook(() => useAccountType(), { wrapper });
    expect(result.current.accountType).toBeUndefined();
    expect(getAccountType).not.toHaveBeenCalled();
  });
});
