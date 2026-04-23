import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TokenType } from '../../../hooks/arbTokenBridge.types';
import { useDestinationToken } from '../../../hooks/useDestinationToken';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { CommonAddress } from '../../../util/CommonAddressUtils';
import { useIsSwapTransfer } from './useIsSwapTransfer';
import { useNetworkSwitchSelectedTokenAddress } from './useNetworkSwitchSelectedTokenAddress';

vi.mock('../../../hooks/useDestinationToken', () => ({
  useDestinationToken: vi.fn(),
}));

vi.mock('../../../hooks/useSelectedToken', () => ({
  useSelectedToken: vi.fn(),
}));

vi.mock('./useIsSwapTransfer', () => ({
  useIsSwapTransfer: vi.fn(),
}));

describe('useNetworkSwitchSelectedTokenAddress', () => {
  const mockedUseDestinationToken = vi.mocked(useDestinationToken);
  const mockedUseSelectedToken = vi.mocked(useSelectedToken);
  const mockedUseIsSwapTransfer = vi.mocked(useIsSwapTransfer);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseIsSwapTransfer.mockReturnValue(false);
    mockedUseSelectedToken.mockReturnValue([
      {
        type: TokenType.ERC20,
        address: CommonAddress.Ethereum.WETH,
        name: 'Wrapped Ether',
        symbol: 'WETH',
        decimals: 18,
        listIds: new Set(['1']),
      },
      vi.fn(),
    ]);
    mockedUseDestinationToken.mockReturnValue({
      type: TokenType.ERC20,
      address: CommonAddress.ArbitrumOne.WETH,
      name: 'Wrapped Ether',
      symbol: 'WETH',
      decimals: 18,
      listIds: new Set(['1']),
    });
  });

  it('rewrites to the destination-chain address when the destination token is only a resolved override', () => {
    // Ethereum -> Arbitrum One:
    // the selected query token is the canonical L1 address, but switching
    // networks should restore the concrete ArbOne token address so flipping
    // back does not collapse the query state to the lookup address forever.
    mockedUseSelectedToken.mockReturnValue([
      {
        type: TokenType.ERC20,
        address: CommonAddress.Ethereum.PYUSD,
        importLookupAddress: CommonAddress.Ethereum.PYUSD,
        name: 'PayPal USD',
        symbol: 'PYUSD',
        decimals: 6,
        listIds: new Set(['1']),
      },
      vi.fn(),
    ]);
    mockedUseDestinationToken.mockReturnValue({
      type: TokenType.ERC20,
      address: CommonAddress.ArbitrumOne.PYUSD,
      importLookupAddress: CommonAddress.Ethereum.PYUSD,
      name: 'PayPal USD',
      symbol: 'PYUSD',
      decimals: 6,
      listIds: new Set(['1']),
    });

    const { result } = renderHook(useNetworkSwitchSelectedTokenAddress);
    expect(result.current).toBe(CommonAddress.ArbitrumOne.PYUSD);
  });

  it('rewrites to the destination-chain address when switching away from an override token', () => {
    // Arbitrum One -> Ethereum:
    // the current selected token resolves to an Arbitrum-side override, but its
    // canonical lookup identity is still Ethereum PYUSD.
    mockedUseSelectedToken.mockReturnValue([
      {
        type: TokenType.ERC20,
        address: CommonAddress.ArbitrumOne.PYUSD,
        importLookupAddress: CommonAddress.Ethereum.PYUSD,
        name: 'PayPal USD',
        symbol: 'PYUSD',
        decimals: 6,
        listIds: new Set(['1']),
      },
      vi.fn(),
    ]);
    mockedUseDestinationToken.mockReturnValue({
      type: TokenType.ERC20,
      address: CommonAddress.Ethereum.PYUSD,
      importLookupAddress: CommonAddress.Ethereum.PYUSD,
      name: 'PayPal USD',
      symbol: 'PYUSD',
      decimals: 6,
      listIds: new Set(['1']),
    });

    const { result } = renderHook(useNetworkSwitchSelectedTokenAddress);
    expect(result.current).toBe(CommonAddress.Ethereum.PYUSD);
  });

  it('rewrites canonical ArbOne PYUSD to Ethereum PYUSD when switching to Ethereum', () => {
    mockedUseSelectedToken.mockReturnValue([
      {
        type: TokenType.ERC20,
        address: CommonAddress.ArbitrumOne.PYUSDCanonical,
        importLookupAddress: CommonAddress.Ethereum.PYUSD,
        name: 'PayPal USD Canonical',
        symbol: 'PYUSD',
        decimals: 6,
        listIds: new Set(['1']),
      },
      vi.fn(),
    ]);
    mockedUseDestinationToken.mockReturnValue({
      type: TokenType.ERC20,
      address: CommonAddress.Ethereum.PYUSD,
      importLookupAddress: CommonAddress.Ethereum.PYUSD,
      name: 'PayPal USD',
      symbol: 'PYUSD',
      decimals: 6,
      listIds: new Set(['1']),
    });

    const { result } = renderHook(useNetworkSwitchSelectedTokenAddress);
    expect(result.current).toBe(CommonAddress.Ethereum.PYUSD);
  });

  it('returns undefined when the resolved destination token keeps the same address', () => {
    // If switching networks would keep the exact same token address,
    // the hook should leave query state untouched.
    mockedUseSelectedToken.mockReturnValue([
      {
        type: TokenType.ERC20,
        address: CommonAddress.Ethereum.WETH,
        name: 'Wrapped Ether',
        symbol: 'WETH',
        decimals: 18,
        listIds: new Set(['1']),
      },
      vi.fn(),
    ]);
    mockedUseDestinationToken.mockReturnValue({
      type: TokenType.ERC20,
      address: CommonAddress.Ethereum.WETH,
      name: 'Wrapped Ether',
      symbol: 'WETH',
      decimals: 18,
      listIds: new Set(['1']),
    });

    const { result } = renderHook(useNetworkSwitchSelectedTokenAddress);
    expect(result.current).toBeUndefined();
  });

  it('returns the canonical lookup token address for swaps', () => {
    // In swap mode, the selected token should always follow the resolved
    // destination token's canonical identity instead of its raw display address.
    mockedUseIsSwapTransfer.mockReturnValue(true);
    mockedUseDestinationToken.mockReturnValue({
      type: TokenType.ERC20,
      address: CommonAddress.ArbitrumOne.PYUSD,
      importLookupAddress: CommonAddress.Ethereum.PYUSD,
      name: 'PayPal USD',
      symbol: 'PYUSD',
      decimals: 6,
      listIds: new Set(['1']),
    });

    const { result } = renderHook(useNetworkSwitchSelectedTokenAddress);
    expect(result.current).toBe(CommonAddress.Ethereum.PYUSD);
  });

  it('returns null for native swaps without a destination token', () => {
    // For swaps that resolve to the native asset, there is no ERC20 token
    // address to keep selected, so the hook clears the token query param.
    mockedUseIsSwapTransfer.mockReturnValue(true);
    mockedUseDestinationToken.mockReturnValue(null);

    const { result } = renderHook(useNetworkSwitchSelectedTokenAddress);
    expect(result.current).toBeNull();
  });
});
