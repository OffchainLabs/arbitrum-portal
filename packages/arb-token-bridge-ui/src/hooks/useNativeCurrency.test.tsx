import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as nativeCurrencyService from '../services/nativeCurrency';
import { createWalletTestWrapper } from '../test-utils/wallet-test-wrapper';
import { ChainId } from '../types/ChainId';
import { getChainMetadata } from '../util/networkMetadata';
import { removeCustomChainFromLocalStorage, saveCustomChainToLocalStorage } from '../util/networks';
import orbitChainsData from '../util/orbitChainsData.json';
import { getWagmiChain } from '../util/wagmi/getWagmiChain';
import { useNativeCurrency } from './useNativeCurrency';

describe.sequential('useNativeCurrency', () => {
  beforeEach(() => {
    vi.spyOn(nativeCurrencyService, 'fetchNativeCurrency').mockRejectedValue(
      new Error('Unknown chain'),
    );
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  it('keeps unknown chain records renderable when metadata cannot be fetched', () => {
    const wrapper = createWalletTestWrapper({
      query: { sourceChain: 1, destinationChain: 42161 },
    });
    const { result } = renderHook(() => useNativeCurrency({ chainId: 999_999_999 }), { wrapper });
    expect(result.current).toMatchObject({ symbol: 'ETH', isCustom: false });
  });

  it.each([
    { chainId: ChainId.Ethereum, symbol: 'ETH', decimals: 18 },
    { chainId: ChainId.Solana, symbol: 'SOL', decimals: 9 },
    // EVM chains show ETH until their native currency loads
    { chainId: ChainId.ApeChain, symbol: 'ETH', decimals: 18 },
  ])('shows $symbol for chain $chainId while loading', ({ chainId, symbol, decimals }) => {
    const wrapper = createWalletTestWrapper({
      query: { sourceChain: 1, destinationChain: 42161 },
    });
    const { result } = renderHook(() => useNativeCurrency({ chainId }), { wrapper });
    expect(result.current).toMatchObject({ symbol, decimals });
  });

  it('uses resolved custom gas token metadata', async () => {
    const customCurrency = {
      name: 'ApeCoin',
      symbol: 'APE',
      decimals: 18,
      isCustom: true as const,
      address: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
    };
    vi.mocked(nativeCurrencyService.fetchNativeCurrency).mockResolvedValue(customCurrency);
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

  it('preserves native currency symbols and decimals for existing chains', () => {
    const supportedChainIds = new Set([
      ...Object.values(ChainId).filter((chainId) => typeof chainId === 'number'),
      ...orbitChainsData.mainnet.map((chain) => chain.chainId),
      ...orbitChainsData.testnet.map((chain) => chain.chainId),
    ]);
    for (const chainId of supportedChainIds) {
      if (chainId === ChainId.Solana) continue;
      const expected = getWagmiChain(chainId).nativeCurrency;
      expect(getChainMetadata(chainId).nativeCurrency).toMatchObject({
        symbol: expected.symbol,
        decimals: expected.decimals,
      });
    }
  });

  it('updates native metadata when custom chains are saved and removed', async () => {
    const fixture = orbitChainsData.mainnet[0];
    if (!fixture) throw new Error('Missing custom chain fixture');
    const chain = {
      ...fixture,
      chainId: 987654321,
      nativeTokenData: {
        name: 'Custom gas',
        symbol: 'GAS',
        decimals: 18,
        address: '0x1111111111111111111111111111111111111111',
      },
      bridgeUiConfig: {
        ...fixture.bridgeUiConfig,
        nativeTokenData: { name: 'Custom gas', symbol: 'GAS' },
      },
    };
    try {
      saveCustomChainToLocalStorage(chain);
      const expected = getWagmiChain(chain.chainId).nativeCurrency;
      expect(expected).toMatchObject({ symbol: 'GAS', decimals: 18 });
      expect(getChainMetadata(chain.chainId).nativeCurrency).toMatchObject({
        name: expected.name,
        symbol: expected.symbol,
        decimals: expected.decimals,
      });
    } finally {
      removeCustomChainFromLocalStorage(chain.chainId);
    }
    expect(() => getChainMetadata(chain.chainId)).toThrow('Unexpected chain id');
  });
});
