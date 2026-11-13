import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { zeroAddress } from 'viem';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBridgeTestWrapper } from '../../test-utils/bridge-test-wrapper';
import { ChainId } from '../../types/ChainId';
import { useNativeCurrencyBalanceForChainId } from '../useNativeCurrencyBalanceForChainId';

afterEach(cleanup);

const walletAddress = '0x1111111111111111111111111111111111111111';
const query = { sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne };

describe.sequential('useNativeCurrencyBalanceForChainId', () => {
  it('returns the native balance with the decimals and symbol of the chain', async () => {
    const fetchBalance = vi.fn(async () => ({ [zeroAddress]: 100_000n }));
    const wrapper = createBridgeTestWrapper({ query, fetchBalance });
    const { result } = renderHook(
      () => useNativeCurrencyBalanceForChainId(ChainId.Ethereum, walletAddress),
      { wrapper },
    );

    await waitFor(() =>
      expect(result.current.data).toEqual({
        balance: BigNumber.from(100_000),
        decimals: 18,
        symbol: 'ETH',
      }),
    );
    expect(fetchBalance).toHaveBeenCalledWith({
      chainId: ChainId.Ethereum,
      walletAddress,
      tokenAddresses: [zeroAddress],
    });
  });

  it('uses the custom gas token of an Orbit chain', async () => {
    const wrapper = createBridgeTestWrapper({
      query,
      fetchBalance: async () => ({ [zeroAddress]: 200_000n }),
    });
    const { result } = renderHook(
      () => useNativeCurrencyBalanceForChainId(ChainId.ApeChain, walletAddress),
      { wrapper },
    );
    await waitFor(() =>
      expect(result.current.data).toEqual({
        balance: BigNumber.from(200_000),
        decimals: 18,
        symbol: 'APE',
      }),
    );
  });

  it('does not fetch without a wallet address', async () => {
    const fetchBalance = vi.fn(async () => ({ [zeroAddress]: 100_000n }));
    const wrapper = createBridgeTestWrapper({ query, fetchBalance });
    const { result } = renderHook(
      () => useNativeCurrencyBalanceForChainId(ChainId.Ethereum, undefined),
      { wrapper },
    );

    expect(result.current.data).toBeUndefined();
    expect(fetchBalance).not.toHaveBeenCalled();
  });

  it('returns no data when the balance is missing from the response', async () => {
    const fetchBalance = vi.fn(async () => ({}));
    const wrapper = createBridgeTestWrapper({ query, fetchBalance });
    const { result } = renderHook(
      () => useNativeCurrencyBalanceForChainId(ChainId.Ethereum, walletAddress),
      { wrapper },
    );

    await waitFor(() => expect(fetchBalance).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeUndefined();
  });
});
