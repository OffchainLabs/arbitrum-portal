import { Provider } from '@ethersproject/providers';
import { renderHook, waitFor } from '@testing-library/react';
import { DecodedValueMap } from 'use-query-params';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Context, useAppState } from '../../state';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { getWagmiChain } from '../../util/wagmi/getWagmiChain';
import { ERC20BridgeToken, TokenType } from '../arbTokenBridge.types';
import { queryParamProviderOptions, useArbQueryParams } from '../useArbQueryParams';
import { useNetworks } from '../useNetworks';
import { useNetworksRelationship } from '../useNetworksRelationship';
import { getUsdcToken, useSelectedToken } from '../useSelectedToken';

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

const mocks = vi.hoisted(() => ({
  getProviderForChainId: vi.fn(),
  getChainIdFromProvider: vi.fn(),
  isTokenNativeUSDC: vi.fn(),
  getL2ERC20Address: vi.fn(),
}));

vi.mock('../useArbQueryParams', () => ({
  useArbQueryParams: vi.fn(),
}));

vi.mock('../useNetworks', () => ({
  useNetworks: vi.fn(),
}));

vi.mock('../useNetworksRelationship', () => ({
  useNetworksRelationship: vi.fn(),
}));

vi.mock('../../state', () => ({
  useAppState: vi.fn(),
}));

vi.mock('../../components/TransferPanel/TokenSearchUtils', () => ({
  useTokensFromLists: () => ({ data: {} }),
  useTokensFromUser: () => ({}),
}));

vi.mock('@/token-bridge-sdk/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/token-bridge-sdk/utils')>();
  return {
    ...actual,
    getProviderForChainId: mocks.getProviderForChainId,
    getChainIdFromProvider: mocks.getChainIdFromProvider,
  };
});

vi.mock('../../util/TokenUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../util/TokenUtils')>();
  mocks.isTokenNativeUSDC.mockImplementation(actual.isTokenNativeUSDC);
  return {
    ...actual,
    isTokenNativeUSDC: mocks.isTokenNativeUSDC,
    getL2ERC20Address: mocks.getL2ERC20Address,
  };
});

describe.sequential('useSelectedToken', () => {
  const mockedUseArbQueryParams = vi.mocked(useArbQueryParams);
  const mockedUseAppState = vi.mocked(useAppState);

  const bridgeTokenArbOneUsdc: ERC20BridgeToken = {
    type: TokenType.ERC20,
    decimals: 6,
    name: 'USDC from bridgeTokens',
    symbol: 'USDC',
    address: CommonAddress.ArbitrumOne.USDC,
    l2Address: '0x00000000000000000000000000000000000000aa',
    listIds: new Set(['1']),
  };

  const bridgeTokenMainnetUsdc: ERC20BridgeToken = {
    ...bridgeTokenArbOneUsdc,
    address: CommonAddress.Ethereum.USDC,
  };

  function mockNetworks({
    sourceChainId,
    destinationChainId,
    parentChainId,
    childChainId,
  }: {
    sourceChainId: ChainId;
    destinationChainId: ChainId;
    parentChainId: ChainId;
    childChainId: ChainId;
  }) {
    vi.mocked(useNetworks).mockReturnValue([
      {
        sourceChain: getWagmiChain(sourceChainId),
        destinationChain: getWagmiChain(destinationChainId),
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useNetworks>);

    vi.mocked(useNetworksRelationship).mockReturnValue({
      parentChain: getWagmiChain(parentChainId),
      childChain: getWagmiChain(childChainId),
    } as unknown as ReturnType<typeof useNetworksRelationship>);
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getProviderForChainId.mockImplementation((chainId: number) => ({ chainId }));
    mocks.getChainIdFromProvider.mockImplementation((provider: { chainId: number }) =>
      Promise.resolve(provider.chainId),
    );
    mocks.getL2ERC20Address.mockResolvedValue('0x00000000000000000000000000000000000000bb');

    mockedUseAppState.mockReturnValue({
      app: {
        arbTokenBridge: {
          bridgeTokens: {
            [bridgeTokenArbOneUsdc.address]: bridgeTokenArbOneUsdc,
            [bridgeTokenMainnetUsdc.address]: bridgeTokenMainnetUsdc,
          },
        },
      },
    } as Context['state']);
  });

  it('returns null when no token is set in the query params', () => {
    mockNetworks({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne,
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne,
    });
    mockedUseArbQueryParams.mockReturnValue([{ ...defaultQueryParams }, vi.fn()]);

    const { result } = renderHook(useSelectedToken);
    expect(result.current[0]).toBeNull();
  });

  it('prefers the token resolved by getUsdcToken over the bridgeTokens entry for a mainnet USDC deposit to Arbitrum One', async () => {
    mockNetworks({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne,
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne,
    });
    mockedUseArbQueryParams.mockReturnValue([
      { ...defaultQueryParams, token: CommonAddress.Ethereum.USDC },
      vi.fn(),
    ]);

    const { result } = renderHook(useSelectedToken);

    // once the usdc fetcher resolves, the token from getUsdcToken wins over the bridgeTokens entry
    await waitFor(() =>
      expect(result.current[0]).toEqual(
        expect.objectContaining({
          name: 'USD Coin',
          address: CommonAddress.Ethereum.USDC,
          l2Address: CommonAddress.ArbitrumOne['USDC.e'],
        }),
      ),
    );
  });

  it('skips getUsdcToken and falls back to bridgeTokens for Arbitrum One native USDC when the destination chain is ApeChain (lifi)', async () => {
    mockNetworks({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.ApeChain,
      parentChainId: ChainId.ArbitrumOne,
      childChainId: ChainId.ApeChain,
    });
    mockedUseArbQueryParams.mockReturnValue([
      { ...defaultQueryParams, token: CommonAddress.ArbitrumOne.USDC },
      vi.fn(),
    ]);

    const { result } = renderHook(useSelectedToken);

    // wait until the usdc fetcher has run past its native USDC check
    await waitFor(() =>
      expect(mocks.isTokenNativeUSDC).toHaveBeenCalledWith(CommonAddress.ArbitrumOne.USDC),
    );

    // the ApeChain guard must bail out before building providers for getUsdcToken
    expect(mocks.getProviderForChainId).not.toHaveBeenCalled();
    expect(result.current[0]).toEqual(bridgeTokenArbOneUsdc);
  });
});

describe.sequential('getUsdcToken', () => {
  function fakeProvider(chainId: ChainId): Provider {
    return { chainId } as unknown as Provider;
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getChainIdFromProvider.mockImplementation((provider: { chainId: number }) =>
      Promise.resolve(provider.chainId),
    );
    mocks.getL2ERC20Address.mockResolvedValue('0x00000000000000000000000000000000000000BB');
  });

  it('returns mainnet USDC with the bridged USDC.e child address for Ethereum -> Arbitrum One', async () => {
    const result = await getUsdcToken({
      tokenAddress: CommonAddress.Ethereum.USDC,
      parentProvider: fakeProvider(ChainId.Ethereum),
      childProvider: fakeProvider(ChainId.ArbitrumOne),
    });

    expect(result).toEqual(
      expect.objectContaining({
        symbol: 'USDC',
        address: CommonAddress.Ethereum.USDC,
        l2Address: CommonAddress.ArbitrumOne['USDC.e'],
      }),
    );
  });

  it('returns Sepolia USDC with the bridged USDC.e child address for Sepolia -> Arbitrum Sepolia', async () => {
    const result = await getUsdcToken({
      tokenAddress: CommonAddress.Sepolia.USDC,
      parentProvider: fakeProvider(ChainId.Sepolia),
      childProvider: fakeProvider(ChainId.ArbitrumSepolia),
    });

    expect(result).toEqual(
      expect.objectContaining({
        symbol: 'USDC',
        address: CommonAddress.Sepolia.USDC,
        l2Address: CommonAddress.ArbitrumSepolia['USDC.e'],
      }),
    );
  });

  it('returns Arbitrum One native USDC as both parent and child address when the parent chain is Ethereum', async () => {
    const result = await getUsdcToken({
      tokenAddress: CommonAddress.ArbitrumOne.USDC,
      parentProvider: fakeProvider(ChainId.Ethereum),
      childProvider: fakeProvider(ChainId.ArbitrumOne),
    });

    expect(result).toEqual(
      expect.objectContaining({
        address: CommonAddress.ArbitrumOne.USDC,
        l2Address: CommonAddress.ArbitrumOne.USDC,
      }),
    );
  });

  it('returns Arbitrum Sepolia native USDC as both parent and child address when the parent chain is Sepolia', async () => {
    const result = await getUsdcToken({
      tokenAddress: CommonAddress.ArbitrumSepolia.USDC,
      parentProvider: fakeProvider(ChainId.Sepolia),
      childProvider: fakeProvider(ChainId.ArbitrumSepolia),
    });

    expect(result).toEqual(
      expect.objectContaining({
        address: CommonAddress.ArbitrumSepolia.USDC,
        l2Address: CommonAddress.ArbitrumSepolia.USDC,
      }),
    );
  });

  it('looks up the child chain address via getL2ERC20Address for Arbitrum One native USDC going to an Orbit chain', async () => {
    const parentProvider = fakeProvider(ChainId.ArbitrumOne);
    const childProvider = fakeProvider(ChainId.ApeChain);

    const result = await getUsdcToken({
      tokenAddress: CommonAddress.ArbitrumOne.USDC,
      parentProvider,
      childProvider,
    });

    expect(mocks.getL2ERC20Address).toHaveBeenCalledWith({
      erc20L1Address: CommonAddress.ArbitrumOne.USDC,
      l1Provider: parentProvider,
      l2Provider: childProvider,
    });
    // the looked-up child chain address is lowercased
    expect(result).toEqual(
      expect.objectContaining({
        address: CommonAddress.ArbitrumOne.USDC,
        l2Address: '0x00000000000000000000000000000000000000bb',
      }),
    );
  });

  it('returns USDC without a child address when the Orbit chain lookup fails (never bridged)', async () => {
    mocks.getL2ERC20Address.mockRejectedValue(new Error('not bridged'));

    const result = await getUsdcToken({
      tokenAddress: CommonAddress.ArbitrumOne.USDC,
      parentProvider: fakeProvider(ChainId.ArbitrumOne),
      childProvider: fakeProvider(ChainId.ApeChain),
    });

    expect(result).toEqual(
      expect.objectContaining({
        address: CommonAddress.ArbitrumOne.USDC,
        l2Address: undefined,
      }),
    );
  });

  it('returns null for a token that is not USDC', async () => {
    const result = await getUsdcToken({
      tokenAddress: '0x0000000000000000000000000000000000000dad',
      parentProvider: fakeProvider(ChainId.Ethereum),
      childProvider: fakeProvider(ChainId.ArbitrumOne),
    });

    expect(result).toBeNull();
  });

  it('returns null for mainnet USDC when the parent chain is not Ethereum', async () => {
    const result = await getUsdcToken({
      tokenAddress: CommonAddress.Ethereum.USDC,
      parentProvider: fakeProvider(ChainId.ArbitrumOne),
      childProvider: fakeProvider(ChainId.ApeChain),
    });

    expect(result).toBeNull();
  });
});
