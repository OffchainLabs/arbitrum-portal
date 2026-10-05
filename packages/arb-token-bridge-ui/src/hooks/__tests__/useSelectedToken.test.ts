import { Provider } from '@ethersproject/providers';
import { act, renderHook, waitFor } from '@testing-library/react';
import { DecodedValueMap } from 'use-query-params';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Context, useAppState } from '../../state';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { LIFI_TRANSFER_LIST_ID } from '../../util/TokenListUtils';
import { initializeBridgeNetworks } from '../../util/networks';
import { getWagmiChain } from '../../util/wagmi/getWagmiChain';
import { ERC20BridgeToken, TokenType } from '../arbTokenBridge.types';
import { queryParamProviderOptions, useArbQueryParams } from '../useArbQueryParams';
import { useNetworks } from '../useNetworks';
import { useNetworksRelationship } from '../useNetworksRelationship';
import { getUsdcToken, useSelectedToken } from '../useSelectedToken';

type ArbQueryParams = DecodedValueMap<typeof queryParamProviderOptions.params>;

// ApeChain and Robinhood Chain must be registered before `getDestinationChainIds` can
// resolve their parent/child relationships.
beforeAll(() => {
  initializeBridgeNetworks();
});

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
      isDepositMode: sourceChainId === parentChainId,
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

  it('clears the destination token when selecting a child-chain-only token', () => {
    const address = '0x0000000000000000000000000000000000004663';
    const token: ERC20BridgeToken = {
      type: TokenType.ERC20,
      name: 'Robinhood-only token',
      symbol: 'RHOOD',
      address,
      l2Address: address,
      decimals: 18,
      listIds: new Set(),
      lifiOnlyChainId: ChainId.RobinhoodChain,
    };
    const setQueryParams = vi.fn();

    mockNetworks({
      sourceChainId: ChainId.RobinhoodChain,
      destinationChainId: ChainId.Ethereum,
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.RobinhoodChain,
    });
    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        sourceChain: ChainId.RobinhoodChain,
        destinationChain: ChainId.Ethereum,
      },
      setQueryParams,
    ]);

    const { result } = renderHook(useSelectedToken);
    act(() => result.current[1](address, token));

    const updateQuery = setQueryParams.mock.calls[0]?.[0] as (
      latestQuery: ArbQueryParams,
    ) => Partial<ArbQueryParams>;
    expect(
      updateQuery({
        ...defaultQueryParams,
        sourceChain: ChainId.RobinhoodChain,
        destinationChain: ChainId.Ethereum,
      }),
    ).toEqual({
      token: address,
      destinationToken: undefined,
    });
  });

  it('keeps the destination token when selecting a paired token with the same address on both chains', () => {
    const address = '0x0000000000000000000000000000000000004663';
    const token: ERC20BridgeToken = {
      type: TokenType.ERC20,
      name: 'Paired token',
      symbol: 'PAIR',
      address,
      l2Address: address,
      decimals: 18,
      listIds: new Set(),
    };
    const setQueryParams = vi.fn();

    mockNetworks({
      sourceChainId: ChainId.RobinhoodChain,
      destinationChainId: ChainId.Ethereum,
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.RobinhoodChain,
    });
    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        sourceChain: ChainId.RobinhoodChain,
        destinationChain: ChainId.Ethereum,
      },
      setQueryParams,
    ]);

    const { result } = renderHook(useSelectedToken);
    act(() => result.current[1](address, token));

    const updateQuery = setQueryParams.mock.calls[0]?.[0] as (
      latestQuery: ArbQueryParams,
    ) => Partial<ArbQueryParams>;
    expect(
      updateQuery({
        ...defaultQueryParams,
        sourceChain: ChainId.RobinhoodChain,
        destinationChain: ChainId.Ethereum,
      }),
    ).toEqual({
      token: address,
      destinationToken: address,
    });
  });

  function getUpdateQuery(setQueryParams: ReturnType<typeof vi.fn>) {
    return setQueryParams.mock.calls[0]?.[0] as (
      latestQuery: ArbQueryParams,
    ) => Partial<ArbQueryParams>;
  }

  it.each([
    { name: 'a canonical-only deposit', isWithdrawal: false, listIds: [], expected: undefined },
    {
      name: 'a deposit with a LiFi token pair',
      isWithdrawal: false,
      listIds: [LIFI_TRANSFER_LIST_ID],
      expected: CommonAddress.Ethereum.USDC,
    },
    {
      name: 'a canonical withdrawal',
      isWithdrawal: true,
      listIds: [],
      expected: CommonAddress.Ethereum.USDC,
    },
  ])(
    'selects an available destination for Robinhood USDC: $name',
    ({ isWithdrawal, listIds, expected }) => {
      const sourceChain = isWithdrawal ? ChainId.RobinhoodChain : ChainId.Ethereum;
      const destinationChain = isWithdrawal ? ChainId.Ethereum : ChainId.RobinhoodChain;
      const query = { ...defaultQueryParams, sourceChain, destinationChain };
      mockNetworks({
        sourceChainId: sourceChain,
        destinationChainId: destinationChain,
        parentChainId: ChainId.Ethereum,
        childChainId: ChainId.RobinhoodChain,
      });
      const setQueryParams = vi.fn();
      mockedUseArbQueryParams.mockReturnValue([query, setQueryParams]);
      const { result } = renderHook(useSelectedToken);

      act(() =>
        result.current[1](CommonAddress.Ethereum.USDC, {
          ...bridgeTokenMainnetUsdc,
          l2Address: '0x80e0e24718dbfcad49ecaa6f1e6c89a190586ca8',
          listIds: new Set(listIds),
        }),
      );

      expect(getUpdateQuery(setQueryParams)(query)).toEqual({
        token: CommonAddress.Ethereum.USDC,
        destinationToken: expected,
      });
    },
  );

  it.each([false, true])(
    'only defaults Arbitrum USDC to USDC on Robinhood with a verified pair: %s',
    (paired) => {
      const robinhoodQuery = {
        ...defaultQueryParams,
        sourceChain: ChainId.ArbitrumOne,
        destinationChain: ChainId.RobinhoodChain,
      };
      mockNetworks({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.RobinhoodChain,
        parentChainId: ChainId.ArbitrumOne,
        childChainId: ChainId.RobinhoodChain,
      });
      const setQueryParams = vi.fn();
      mockedUseArbQueryParams.mockReturnValue([robinhoodQuery, setQueryParams]);

      const { result } = renderHook(useSelectedToken);
      act(() =>
        result.current[1](CommonAddress.ArbitrumOne.USDC, {
          ...bridgeTokenArbOneUsdc,
          l2Address: paired ? bridgeTokenArbOneUsdc.l2Address : undefined,
          lifiOnlyChainId: paired ? undefined : ChainId.ArbitrumOne,
        }),
      );

      expect(getUpdateQuery(setQueryParams)(robinhoodQuery)).toEqual({
        token: CommonAddress.ArbitrumOne.USDC,
        destinationToken: paired ? CommonAddress.ArbitrumOne.USDC : undefined,
      });
    },
  );

  it.each([false, true])(
    'resolves sibling-chain USDC without replacing a verified pair: %s',
    async (paired) => {
      mockNetworks({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.RobinhoodChain,
        parentChainId: ChainId.ArbitrumOne,
        childChainId: ChainId.RobinhoodChain,
      });
      mockedUseArbQueryParams.mockReturnValue([
        { ...defaultQueryParams, token: CommonAddress.ArbitrumOne.USDC },
        vi.fn(),
      ]);
      mockedUseAppState.mockReturnValue({
        app: {
          arbTokenBridge: {
            bridgeTokens: paired
              ? {
                  [bridgeTokenArbOneUsdc.address]: bridgeTokenArbOneUsdc,
                }
              : {},
          },
        },
      } as Context['state']);

      const { result } = renderHook(useSelectedToken);
      await waitFor(() =>
        expect(result.current[0]).toMatchObject(
          paired
            ? bridgeTokenArbOneUsdc
            : {
                address: CommonAddress.ArbitrumOne.USDC,
                lifiOnlyChainId: ChainId.ArbitrumOne,
              },
        ),
      );
      expect(mocks.getL2ERC20Address).not.toHaveBeenCalled();
    },
  );
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

  it('keeps Arbitrum USDC source-only for Robinhood without querying an unrelated canonical gateway', async () => {
    const token = await getUsdcToken({
      tokenAddress: CommonAddress.ArbitrumOne.USDC,
      parentProvider: fakeProvider(ChainId.ArbitrumOne),
      childProvider: fakeProvider(ChainId.RobinhoodChain),
    });

    expect(token).toMatchObject({
      symbol: 'USDC',
      address: CommonAddress.ArbitrumOne.USDC,
      lifiOnlyChainId: ChainId.ArbitrumOne,
    });
    expect(token?.l2Address).toBeUndefined();
    expect(mocks.getL2ERC20Address).not.toHaveBeenCalled();
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
