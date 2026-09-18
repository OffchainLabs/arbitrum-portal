import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { constants } from 'ethers';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { getNativeCurrencyPrice } from '../services/nativeCurrency';
import { createWalletTestWrapper } from '../test-utils/wallet-test-wrapper';
import { ChainId } from '../types/ChainId';
import { CommonAddress } from '../util/CommonAddressUtils';
import { orbitMainnets } from '../util/orbitChainsList';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '../wallet/constants';
import { useNativeCurrencyForTransfer } from './useNativeCurrency';
import { useSourceChainNativeCurrencyDecimals } from './useSourceChainNativeCurrencyDecimals';

vi.mock('../util/featureFlag', async (actual) => ({
  ...(await actual<typeof import('../util/featureFlag')>()),
  isSolanaEnabled: () => true,
  isLifiEnabled: () => true,
}));

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

describe.sequential('transfer native currency', () => {
  it.each([
    [ChainId.Ethereum, ChainId.ApeChain, CommonAddress.Ethereum.APE],
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
    const { result: decimals } = renderHook(() => useSourceChainNativeCurrencyDecimals(), {
      wrapper,
    });
    expect(decimals.current).toBe(18);

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

  it.each([ChainId.ArbitrumOne, ChainId.ApeChain])(
    'keeps source SOL separate from the destination currency on %s',
    async (destination) => {
      const wrapper = createWalletTestWrapper({
        query: { sourceChain: ChainId.Solana, destinationChain: destination },
      });
      const { result } = renderHook(
        () => ({
          source: useNativeCurrencyForTransfer(),
          destination: useNativeCurrencyForTransfer({ isDestination: true }),
        }),
        { wrapper },
      );
      expect(result.current.source).toMatchObject({
        symbol: 'SOL',
        decimals: 9,
        balanceDecimals: 9,
        nativeTokenChainId: ChainId.Solana,
        priceAddress: SOLANA_NATIVE_TOKEN_ADDRESS,
      });
      expect(
        getNativeCurrencyPrice({
          ...result.current.source,
          tokensFromLists: {},
          ethPrice: 2000,
        }),
      ).toBeUndefined();
      await waitFor(() =>
        expect(result.current.destination.isCustom).toBe(destination === ChainId.ApeChain),
      );
      expect(result.current.destination).toMatchObject({
        symbol: destination === ChainId.ApeChain ? 'APE' : 'ETH',
        balanceDecimals: 18,
        nativeTokenChainId: destination,
      });
    },
  );
});
