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

  it('returns undefined (keeps the current token) when the resolved destination token is the same logical token', () => {
    // Ethereum (PYUSD) to ArbitrumOne (PYUSD OFT)
    // Different addresses but same "logical" token
    // Returns undefined to keep the current token
    mockedUseSelectedToken.mockReturnValue([
      {
        type: TokenType.ERC20,
        address: CommonAddress.Ethereum.PYUSD,
        importLookupAddress: CommonAddress.Ethereum.PYUSD,
        name: 'PYUSD',
        symbol: 'PYUSD',
        decimals: 6,
        listIds: new Set(['1']),
      },
      vi.fn(),
    ]);
    mockedUseDestinationToken.mockReturnValue({
      type: TokenType.ERC20,
      address: CommonAddress.ArbitrumOne.PYUSDOFT,
      importLookupAddress: CommonAddress.Ethereum.PYUSD,
      name: 'PYUSD OFT',
      symbol: 'PYUSD',
      decimals: 6,
      listIds: new Set(['1']),
    });

    const { result } = renderHook(useNetworkSwitchSelectedTokenAddress);
    expect(result.current).toBeUndefined();
  });

  it('returns the resolved destination token address for swaps', () => {
    // LiFi swap from Ethereum (PYUSD) to ArbitrumOne (PYUSD OFT)
    // Different addresses but same "logical" token
    // Returns the destination token (PYUSD OFT)
    mockedUseIsSwapTransfer.mockReturnValue(true);
    mockedUseDestinationToken.mockReturnValue({
      type: TokenType.ERC20,
      address: CommonAddress.ArbitrumOne.PYUSDOFT,
      importLookupAddress: CommonAddress.Ethereum.PYUSD,
      name: 'PYUSD OFT',
      symbol: 'PYUSD',
      decimals: 6,
      listIds: new Set(['1']),
    });

    const { result } = renderHook(useNetworkSwitchSelectedTokenAddress);
    expect(result.current).toBe(CommonAddress.ArbitrumOne.PYUSDOFT);
  });

  it('returns null for native swaps without a destination token', () => {
    // LiFi swaps to native currency
    // Returns null to clear the selected token
    mockedUseIsSwapTransfer.mockReturnValue(true);
    mockedUseDestinationToken.mockReturnValue(null);

    const { result } = renderHook(useNetworkSwitchSelectedTokenAddress);
    expect(result.current).toBeNull();
  });
});
