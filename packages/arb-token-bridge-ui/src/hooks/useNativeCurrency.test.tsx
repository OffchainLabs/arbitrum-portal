import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { constants } from 'ethers';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as nativeCurrencyService from '../services/nativeCurrency';
import { getNativeCurrencyPrice } from '../services/nativeCurrency';
import { createWalletTestWrapper } from '../test-utils/wallet-test-wrapper';
import { ChainId } from '../types/ChainId';
import { CommonAddress } from '../util/CommonAddressUtils';
import { getChainMetadata } from '../util/networkMetadata';
import { removeCustomChainFromLocalStorage, saveCustomChainToLocalStorage } from '../util/networks';
import orbitChainsData from '../util/orbitChainsData.json';
import { orbitMainnets } from '../util/orbitChainsList';
import { getWagmiChain } from '../util/wagmi/getWagmiChain';
import { useNativeCurrency, useNativeCurrencyForTransfer } from './useNativeCurrency';

vi.mock('../token-bridge-sdk/utils', async (actual) => ({
  ...(await actual<typeof import('../token-bridge-sdk/utils')>()),
  getProviderForChainId: (chainId: number) => ({ getNetwork: async () => ({ chainId }) }),
}));
vi.mock('../util/TokenUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../util/TokenUtils')>()),
  fetchErc20Data: async () => ({ name: 'ApeCoin', symbol: 'APE', decimals: 18 }),
}));
beforeAll(() => {
  const apeChain = orbitMainnets[ChainId.ApeChain];
  if (!apeChain) throw new Error('Missing ApeChain fixture');
  registerCustomArbitrumNetwork(apeChain);
});
afterEach(cleanup);

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

describe.sequential('transfer native currency', () => {
  it.each([
    [ChainId.ArbitrumOne, ChainId.ApeChain, CommonAddress.ArbitrumOne.APE],
    [ChainId.ApeChain, ChainId.ArbitrumOne, CommonAddress.ArbitrumOne.APE],
  ])('preserves the custom gas token for %s to %s', async (source, destination, address) => {
    const wrapper = createWalletTestWrapper({
      query: { sourceChain: source, destinationChain: destination },
    });
    const { result } = renderHook(() => useNativeCurrencyForTransfer(), { wrapper });
    await waitFor(() => expect(result.current.isCustom).toBe(true));
    expect(result.current).toMatchObject({
      symbol: 'APE',
      decimals: 18,
      balanceDecimals: 18,
      nativeTokenChainId: ChainId.ApeChain,
      priceAddress: address.toLowerCase(),
    });

    const { result: eth } = renderHook(
      () => useNativeCurrencyForTransfer({ tokenAddress: constants.AddressZero }),
      { wrapper },
    );
    await waitFor(() =>
      expect(eth.current.nativeTokenChainId).toBe(
        source === ChainId.ApeChain ? destination : source,
      ),
    );
    expect(eth.current.symbol).toBe('ETH');
    expect(getNativeCurrencyPrice({ ...eth.current, tokensFromLists: {}, ethPrice: 2000 })).toBe(
      2000,
    );
  });

  it('keeps the same reference across renders once the currencies are loaded', async () => {
    const wrapper = createWalletTestWrapper({
      query: { sourceChain: ChainId.ArbitrumOne, destinationChain: ChainId.ApeChain },
    });
    const { result, rerender } = renderHook(() => useNativeCurrencyForTransfer(), { wrapper });
    await waitFor(() => {
      const previous = result.current;
      rerender();
      expect(result.current.isCustom).toBe(true);
      expect(result.current).toBe(previous);
    });
  });
});
