import { renderHook } from '@testing-library/react';
import { constants } from 'ethers';
import { DecodedValueMap } from 'use-query-params';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ERC20BridgeToken, TokenType } from '../../../hooks/arbTokenBridge.types';
import { queryParamProviderOptions, useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { CommonAddress } from '../../../util/CommonAddressUtils';
import {
  getArbitrumOnePyusdCanonicalToken,
  getArbitrumOnePyusdOftToken,
  getEthereumPyusdToken,
} from '../../../util/PyusdUtils';
import { useIsSwapTransfer } from './useIsSwapTransfer';

type ArbQueryParams = DecodedValueMap<typeof queryParamProviderOptions.params>;

const defaultQueryParams: ArbQueryParams = {
  sourceChain: undefined,
  destinationChain: undefined,
  amount: '',
  amount2: '',
  destinationAddress: undefined,
  token: undefined,
  destinationToken: undefined,
  settingsOpen: false,
  tab: 0,
  disabledFeatures: [],
  theme: {},
  debugLevel: 'silent',
  experiments: undefined,
};

vi.mock('../../../hooks/useArbQueryParams', () => ({
  useArbQueryParams: vi.fn(),
}));

vi.mock('../../../hooks/useSelectedToken', () => ({
  useSelectedToken: vi.fn(),
}));

describe('useIsSwapTransfer', () => {
  const mockedUseArbQueryParams = vi.mocked(useArbQueryParams);
  const mockedUseSelectedToken = vi.mocked(useSelectedToken);
  const defaultSelectedToken: ERC20BridgeToken = {
    address: CommonAddress.Ethereum.WETH,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoURI: 'https://example.com/weth.png',
    listIds: new Set(['1']),
    type: TokenType.ERC20,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        destinationToken: CommonAddress.Ethereum.WETH,
      },
      vi.fn(),
    ]);

    mockedUseSelectedToken.mockReturnValue([defaultSelectedToken, vi.fn()]);
  });

  it('does not treat PYUSD (OFT) to PYUSD (L1) as a swap', () => {
    mockedUseSelectedToken.mockReturnValue([
      getArbitrumOnePyusdOftToken({
        priceUSD: 1,
        listIds: new Set(['1']),
      }),
      vi.fn(),
    ]);
    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        destinationToken: CommonAddress.Ethereum.PYUSD,
      },
      vi.fn(),
    ]);

    const { result } = renderHook(useIsSwapTransfer);
    expect(result.current).toBe(false);
  });

  it('does not treat PYUSD (Canonical) to PYUSD (L1) as a swap', () => {
    mockedUseSelectedToken.mockReturnValue([
      getArbitrumOnePyusdCanonicalToken({
        priceUSD: 1,
        listIds: new Set(['1']),
      }),
      vi.fn(),
    ]);
    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        destinationToken: CommonAddress.Ethereum.PYUSD,
      },
      vi.fn(),
    ]);

    const { result } = renderHook(useIsSwapTransfer);
    expect(result.current).toBe(false);
  });

  it('does not treat PYUSD (L1) to PYUSD (OFT) as a swap', () => {
    mockedUseSelectedToken.mockReturnValue([
      getEthereumPyusdToken({
        priceUSD: 1,
        listIds: new Set(['1']),
      }),
      vi.fn(),
    ]);
    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        destinationToken: CommonAddress.Ethereum.PYUSD,
      },
      vi.fn(),
    ]);

    const { result } = renderHook(useIsSwapTransfer);
    expect(result.current).toBe(false);
  });

  it('returns true when destination token differs from the selected token', () => {
    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        destinationToken: constants.AddressZero,
      },
      vi.fn(),
    ]);

    const { result } = renderHook(useIsSwapTransfer);
    expect(result.current).toBe(true);
  });

  it('does not treat canonical USDC deposits as a swap when destinationToken matches the L2 address', () => {
    mockedUseSelectedToken.mockReturnValue([
      {
        type: TokenType.ERC20,
        address: CommonAddress.Ethereum.USDC,
        l2Address: CommonAddress.ArbitrumOne['USDC.e'],
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        listIds: new Set(['1']),
      },
      vi.fn(),
    ]);
    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        destinationToken: CommonAddress.ArbitrumOne['USDC.e'],
      },
      vi.fn(),
    ]);

    const { result } = renderHook(useIsSwapTransfer);
    expect(result.current).toBe(false);
  });

  it('treats ETH to ARB as a swap when destinationToken changes to a different asset', () => {
    mockedUseSelectedToken.mockReturnValue([defaultSelectedToken, vi.fn()]);
    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        destinationToken: CommonAddress.ArbitrumOne.ARB,
      },
      vi.fn(),
    ]);

    const { result } = renderHook(useIsSwapTransfer);
    expect(result.current).toBe(true);
  });

  it('treats USDC to USDT as a swap when destinationToken points to another token', () => {
    mockedUseSelectedToken.mockReturnValue([
      {
        type: TokenType.ERC20,
        address: CommonAddress.Ethereum.USDC,
        l2Address: CommonAddress.ArbitrumOne['USDC.e'],
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        listIds: new Set(['1']),
      },
      vi.fn(),
    ]);
    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        destinationToken: CommonAddress.ArbitrumOne.USDT,
      },
      vi.fn(),
    ]);

    const { result } = renderHook(useIsSwapTransfer);
    expect(result.current).toBe(true);
  });

  it('returns false when destinationToken is undefined', () => {
    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        destinationToken: undefined,
      },
      vi.fn(),
    ]);

    const { result } = renderHook(useIsSwapTransfer);
    expect(result.current).toBe(false);
  });

  it('returns false when destinationToken is undefined and selectedToken is null', () => {
    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        destinationToken: undefined,
      },
      vi.fn(),
    ]);
    mockedUseSelectedToken.mockReturnValue([null, vi.fn()]);

    const { result } = renderHook(useIsSwapTransfer);
    expect(result.current).toBe(false);
  });
});
