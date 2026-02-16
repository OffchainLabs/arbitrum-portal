import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TokenType } from '../../../hooks/arbTokenBridge.types';
import { ChainId } from '../../../types/ChainId';
import { CommonAddress } from '../../../util/CommonAddressUtils';
import { useIsCctpTransfer } from './useIsCctpTransfer';

const mocks = vi.hoisted(() => ({
  queryParams: {} as {
    sourceChain?: number;
    destinationChain?: number;
    token?: string;
    destinationToken?: string;
  },
  setQueryParams: vi.fn(),
  useArbQueryParams: vi.fn(),
}));

vi.mock('../../../hooks/useArbQueryParams', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../hooks/useArbQueryParams')>();
  return {
    ...actual,
    useArbQueryParams: mocks.useArbQueryParams,
  };
});

vi.mock('../../../hooks/useDisabledFeatures', () => ({
  useDisabledFeatures: () => ({
    isFeatureDisabled: () => false,
  }),
}));

vi.mock('../../../util/networks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../util/networks')>();
  return {
    ...actual,
    getCustomChainsFromLocalStorage: () => [],
  };
});

vi.mock('../../../token-bridge-sdk/utils', () => ({
  getProviderForChainId: () => ({}),
}));

vi.mock('../../../util/wagmi/getWagmiChain', () => ({
  getWagmiChain: (chainId: number) => ({ id: chainId }),
}));

vi.mock('../TokenSearchUtils', () => ({
  useTokensFromLists: () => {
    const token = mocks.queryParams.token;
    if (!token) {
      return {};
    }
    return {
      [token]: {
        address: token,
        decimals: 6,
        symbol: 'MOCK',
        name: 'Mock Token',
        type: TokenType.ERC20,
        listIds: new Set<string>(['1']),
      },
    };
  },
  useTokensFromUser: () => ({}),
}));

describe('useIsCctpTransfer', () => {
  const setQueryParams = (overrides: Partial<typeof mocks.queryParams>) => {
    mocks.queryParams = { ...mocks.queryParams, ...overrides };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.queryParams = {
      sourceChain: ChainId.Ethereum,
      destinationChain: ChainId.ArbitrumOne,
      token: '0xNotUsdc',
      destinationToken: '0xNotUsdc',
    };
    mocks.setQueryParams = vi.fn();

    mocks.useArbQueryParams.mockImplementation(() => [mocks.queryParams, mocks.setQueryParams]);
  });

  it('returns false when swap transfer is enabled', () => {
    setQueryParams({
      sourceChain: ChainId.Ethereum,
      destinationChain: ChainId.ArbitrumOne,
      token: '0xNotUsdc',
      destinationToken: '0xDifferent',
    });

    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(false);
  });

  it('returns false when no token is selected', () => {
    setQueryParams({
      sourceChain: ChainId.Ethereum,
      destinationChain: ChainId.ArbitrumOne,
      token: undefined,
      destinationToken: undefined,
    });

    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(false);
  });

  it('returns false when teleport mode is active', () => {
    setQueryParams({
      sourceChain: ChainId.Ethereum,
      destinationChain: ChainId.Superposition,
      token: CommonAddress.Ethereum.USDC,
      destinationToken: CommonAddress.Ethereum.USDC,
    });

    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(false);
  });

  it('returns true for deposit of mainnet USDC to Arbitrum One', () => {
    setQueryParams({
      sourceChain: ChainId.Ethereum,
      destinationChain: ChainId.ArbitrumOne,
      token: CommonAddress.Ethereum.USDC,
      destinationToken: CommonAddress.Ethereum.USDC,
    });

    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(true);
  });

  it('returns true for deposit of Sepolia USDC to Arbitrum Sepolia', () => {
    setQueryParams({
      sourceChain: ChainId.Sepolia,
      destinationChain: ChainId.ArbitrumSepolia,
      token: CommonAddress.Sepolia.USDC,
      destinationToken: CommonAddress.Sepolia.USDC,
    });

    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(true);
  });

  it('returns true for withdrawal of Arbitrum One native USDC', () => {
    setQueryParams({
      sourceChain: ChainId.ArbitrumOne,
      destinationChain: ChainId.Ethereum,
      token: CommonAddress.ArbitrumOne.USDC,
      destinationToken: CommonAddress.ArbitrumOne.USDC,
    });

    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(true);
  });

  it('returns true for withdrawal of Arbitrum Sepolia native USDC', () => {
    setQueryParams({
      sourceChain: ChainId.ArbitrumSepolia,
      destinationChain: ChainId.Sepolia,
      token: CommonAddress.ArbitrumSepolia.USDC,
      destinationToken: CommonAddress.ArbitrumSepolia.USDC,
    });

    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(true);
  });

  it('returns false when token does not match any CCTP criteria', () => {
    setQueryParams({
      sourceChain: ChainId.Ethereum,
      destinationChain: ChainId.ArbitrumOne,
      token: '0xNotUsdc',
      destinationToken: '0xNotUsdc',
    });

    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(false);
  });

  it('returns false for non-Arbitrum networks even when token matches', () => {
    setQueryParams({
      sourceChain: ChainId.ArbitrumNova,
      destinationChain: ChainId.Ethereum,
      token: CommonAddress.Ethereum.USDC,
      destinationToken: CommonAddress.Ethereum.USDC,
    });

    const { result } = renderHook(() => useIsCctpTransfer());

    expect(result.current).toBe(false);
  });
});
