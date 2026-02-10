import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../types/ChainId';
import { CommonAddress } from '../../../util/CommonAddressUtils';
import { useIsCctpTransfer } from './useIsCctpTransfer';

const mocks = vi.hoisted(() => {
  return {
    useSelectedToken: vi.fn(),
    useNetworks: vi.fn(),
    useArbQueryParams: vi.fn(),
  };
});

vi.mock('../../../hooks/useSelectedToken', () => ({
  useSelectedToken: mocks.useSelectedToken,
}));

vi.mock('../../../hooks/useNetworks', () => ({
  useNetworks: mocks.useNetworks,
}));

vi.mock('../../../hooks/useArbQueryParams', () => ({
  useArbQueryParams: mocks.useArbQueryParams,
}));

const defaultToken = { address: '0xToken' };

const setNetworks = ({
  sourceChainId,
  destinationChainId,
}: {
  sourceChainId: ChainId;
  destinationChainId: ChainId;
}) => {
  mocks.useNetworks.mockReturnValue([
    {
      sourceChain: { id: sourceChainId },
      sourceChainProvider: {},
      destinationChain: { id: destinationChainId },
      destinationChainProvider: {},
    },
  ]);
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useSelectedToken.mockReturnValue([defaultToken]);
  mocks.useArbQueryParams.mockReturnValue([{ destinationToken: defaultToken.address }, vi.fn()]);
  setNetworks({ sourceChainId: ChainId.Ethereum, destinationChainId: ChainId.ArbitrumOne });
});

describe('useIsCctpTransfer', () => {
  it('returns false when swap transfer is enabled', () => {
    mocks.useArbQueryParams.mockReturnValue([{ destinationToken: '0xDifferent' }, vi.fn()]);

    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(false);
  });

  it('returns false when no token is selected', () => {
    mocks.useSelectedToken.mockReturnValue([null]);

    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(false);
  });

  it('returns false when teleport mode is active', () => {
    mocks.useSelectedToken.mockReturnValue([{ address: CommonAddress.Ethereum.USDC }]);
    setNetworks({ sourceChainId: ChainId.Ethereum, destinationChainId: ChainId.Superposition });

    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(false);
  });

  it('returns true for deposit of mainnet USDC to Arbitrum One', () => {
    mocks.useSelectedToken.mockReturnValue([{ address: CommonAddress.Ethereum.USDC }]);
    setNetworks({ sourceChainId: ChainId.Ethereum, destinationChainId: ChainId.ArbitrumOne });

    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(true);
  });

  it('returns true for deposit of Sepolia USDC to Arbitrum Sepolia', () => {
    mocks.useSelectedToken.mockReturnValue([{ address: CommonAddress.Sepolia.USDC }]);
    setNetworks({ sourceChainId: ChainId.Sepolia, destinationChainId: ChainId.ArbitrumSepolia });

    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(true);
  });

  it('returns true for withdrawal of Arbitrum One native USDC', () => {
    mocks.useSelectedToken.mockReturnValue([{ address: CommonAddress.ArbitrumOne.USDC }]);
    setNetworks({ sourceChainId: ChainId.ArbitrumOne, destinationChainId: ChainId.Ethereum });

    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(true);
  });

  it('returns true for withdrawal of Arbitrum Sepolia native USDC', () => {
    mocks.useSelectedToken.mockReturnValue([{ address: CommonAddress.ArbitrumSepolia.USDC }]);
    setNetworks({ sourceChainId: ChainId.ArbitrumSepolia, destinationChainId: ChainId.Sepolia });

    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(true);
  });

  it('returns false when token does not match any CCTP criteria', () => {
    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(false);
  });

  it('returns false for non-Arbitrum networks even when token matches', () => {
    mocks.useSelectedToken.mockReturnValue([{ address: CommonAddress.Ethereum.USDC }]);
    setNetworks({ sourceChainId: ChainId.Base, destinationChainId: ChainId.Ethereum });

    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(false);
  });
});
