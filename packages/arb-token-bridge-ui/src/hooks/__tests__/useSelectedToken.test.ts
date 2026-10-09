import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getUsdcToken } from '../../services/tokenMetadata';
import { createBridgeTestWrapper } from '../../test-utils/bridge-test-wrapper';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { LIFI_TRANSFER_LIST_ID } from '../../util/TokenListUtils';
import { initializeBridgeNetworks } from '../../util/networks';
import { ERC20BridgeToken, TokenType } from '../arbTokenBridge.types';
import { useArbQueryParams } from '../useArbQueryParams';
import { useSelectedToken } from '../useSelectedToken';

vi.mock('../../util/featureFlag', async (actual) => ({
  ...(await actual<typeof import('../../util/featureFlag')>()),
  isLifiEnabled: () => true,
}));

// ApeChain and Robinhood Chain must be registered before `getDestinationChainIds` can
// resolve their parent/child relationships.
beforeAll(() => {
  initializeBridgeNetworks();
});

const mocks = vi.hoisted(() => ({
  getProviderForChainId: vi.fn(),
  getChainIdFromProvider: vi.fn(),
  isTokenNativeUSDC: vi.fn(),
  getL2ERC20Address: vi.fn(),
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
function useSelection() {
  return { selected: useSelectedToken(), query: useArbQueryParams()[0] };
}
describe.sequential('useSelectedToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProviderForChainId.mockImplementation((chainId: number) => ({
      chainId,
      getNetwork: async () => ({ chainId }),
    }));
    mocks.getChainIdFromProvider.mockImplementation((provider: { chainId: number }) =>
      Promise.resolve(provider.chainId),
    );
    mocks.getL2ERC20Address.mockResolvedValue('0x00000000000000000000000000000000000000bb');
  });
  it('returns null without a selected token', () => {
    const { result } = renderHook(useSelectedToken, {
      wrapper: createBridgeTestWrapper({
        query: { sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne },
      }),
    });
    expect(result.current[0]).toBeNull();
  });
  it('prefers canonical USDC metadata over a saved entry', async () => {
    const { result } = renderHook(useSelectedToken, {
      wrapper: createBridgeTestWrapper({
        query: {
          sourceChain: ChainId.Ethereum,
          destinationChain: ChainId.ArbitrumOne,
          token: bridgeTokenMainnetUsdc.address,
        },
        bridgeTokens: { [bridgeTokenMainnetUsdc.address]: bridgeTokenMainnetUsdc },
      }),
    });
    await waitFor(() =>
      expect(result.current[0]).toMatchObject({
        name: 'USD Coin',
        address: CommonAddress.Ethereum.USDC,
        l2Address: CommonAddress.ArbitrumOne['USDC.e'],
      }),
    );
  });
  it('keeps Arbitrum native USDC metadata for an ApeChain transfer', async () => {
    const { result } = renderHook(useSelectedToken, {
      wrapper: createBridgeTestWrapper({
        query: {
          sourceChain: ChainId.ArbitrumOne,
          destinationChain: ChainId.ApeChain,
          token: bridgeTokenArbOneUsdc.address,
        },
        bridgeTokens: { [bridgeTokenArbOneUsdc.address]: bridgeTokenArbOneUsdc },
      }),
    });
    await waitFor(() =>
      expect(mocks.isTokenNativeUSDC).toHaveBeenCalledWith(CommonAddress.ArbitrumOne.USDC),
    );
    expect(mocks.getL2ERC20Address).not.toHaveBeenCalled();
    expect(result.current[0]).toEqual(bridgeTokenArbOneUsdc);
  });
  it.each([false, true])('selects a Robinhood token with a verified pair: %s', async (paired) => {
    const address = '0x0000000000000000000000000000000000004663';
    const token: ERC20BridgeToken = {
      type: TokenType.ERC20,
      name: 'Robinhood token',
      symbol: 'RHOOD',
      address,
      l2Address: address,
      decimals: 18,
      listIds: new Set(),
      ...(paired ? {} : { lifiOnlyChainId: ChainId.RobinhoodChain }),
    };
    const { result } = renderHook(useSelection, {
      wrapper: createBridgeTestWrapper({
        query: { sourceChain: ChainId.RobinhoodChain, destinationChain: ChainId.Ethereum },
      }),
    });
    act(() => result.current.selected[1](address, token));
    await waitFor(() =>
      expect(result.current.query).toMatchObject({
        token: address,
        destinationToken: paired ? address : undefined,
      }),
    );
  });
  it.each([
    { name: 'canonical-only deposit', isWithdrawal: false, listIds: [], expected: undefined },
    {
      name: 'deposit with a LiFi pair',
      isWithdrawal: false,
      listIds: [LIFI_TRANSFER_LIST_ID],
      expected: CommonAddress.Ethereum.USDC,
    },
    {
      name: 'canonical withdrawal',
      isWithdrawal: true,
      listIds: [],
      expected: CommonAddress.Ethereum.USDC,
    },
  ])(
    'selects an available destination for Robinhood USDC: $name',
    async ({ isWithdrawal, listIds, expected }) => {
      const { result } = renderHook(useSelection, {
        wrapper: createBridgeTestWrapper({
          query: {
            sourceChain: isWithdrawal ? ChainId.RobinhoodChain : ChainId.Ethereum,
            destinationChain: isWithdrawal ? ChainId.Ethereum : ChainId.RobinhoodChain,
          },
        }),
      });
      act(() =>
        result.current.selected[1](CommonAddress.Ethereum.USDC, {
          ...bridgeTokenMainnetUsdc,
          l2Address: '0x80e0e24718dbfcad49ecaa6f1e6c89a190586ca8',
          listIds: new Set(listIds),
        }),
      );
      await waitFor(() =>
        expect(result.current.query).toMatchObject({
          token: CommonAddress.Ethereum.USDC,
          destinationToken: expected,
        }),
      );
    },
  );
  it.each([false, true])(
    'defaults Arbitrum USDC to USDC on Robinhood with a verified pair: %s',
    async (paired) => {
      const { result } = renderHook(useSelection, {
        wrapper: createBridgeTestWrapper({
          query: { sourceChain: ChainId.ArbitrumOne, destinationChain: ChainId.RobinhoodChain },
        }),
      });
      act(() =>
        result.current.selected[1](CommonAddress.ArbitrumOne.USDC, {
          ...bridgeTokenArbOneUsdc,
          l2Address: paired ? bridgeTokenArbOneUsdc.l2Address : undefined,
          lifiOnlyChainId: paired ? undefined : ChainId.ArbitrumOne,
        }),
      );
      await waitFor(() =>
        expect(result.current.query).toMatchObject({
          token: CommonAddress.ArbitrumOne.USDC,
          destinationToken: paired ? CommonAddress.ArbitrumOne.USDC : undefined,
        }),
      );
    },
  );
  it.each([false, true])(
    'resolves sibling-chain USDC without replacing a verified pair: %s',
    async (paired) => {
      const { result } = renderHook(useSelectedToken, {
        wrapper: createBridgeTestWrapper({
          query: {
            sourceChain: ChainId.ArbitrumOne,
            destinationChain: ChainId.RobinhoodChain,
            token: CommonAddress.ArbitrumOne.USDC,
          },
          bridgeTokens: paired ? { [bridgeTokenArbOneUsdc.address]: bridgeTokenArbOneUsdc } : {},
        }),
      });
      await waitFor(() =>
        expect(result.current[0]).toMatchObject(
          paired
            ? bridgeTokenArbOneUsdc
            : { address: CommonAddress.ArbitrumOne.USDC, lifiOnlyChainId: ChainId.ArbitrumOne },
        ),
      );
      expect(mocks.getL2ERC20Address).not.toHaveBeenCalled();
    },
  );
});
describe.sequential('getUsdcToken', () => {
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
      parentChainId: ChainId.ArbitrumOne,
      childChainId: ChainId.RobinhoodChain,
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
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne,
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
      parentChainId: ChainId.Sepolia,
      childChainId: ChainId.ArbitrumSepolia,
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
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne,
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
      parentChainId: ChainId.Sepolia,
      childChainId: ChainId.ArbitrumSepolia,
    });

    expect(result).toEqual(
      expect.objectContaining({
        address: CommonAddress.ArbitrumSepolia.USDC,
        l2Address: CommonAddress.ArbitrumSepolia.USDC,
      }),
    );
  });

  it('looks up the child chain address via getL2ERC20Address for Arbitrum One native USDC going to an Orbit chain', async () => {
    const parentProvider = { chainId: ChainId.ArbitrumOne };
    const childProvider = { chainId: ChainId.ApeChain };
    mocks.getProviderForChainId.mockImplementation((chainId: number) =>
      chainId === ChainId.ArbitrumOne ? parentProvider : childProvider,
    );

    const result = await getUsdcToken({
      tokenAddress: CommonAddress.ArbitrumOne.USDC,
      parentChainId: ChainId.ArbitrumOne,
      childChainId: ChainId.ApeChain,
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
      parentChainId: ChainId.ArbitrumOne,
      childChainId: ChainId.ApeChain,
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
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne,
    });

    expect(result).toBeNull();
  });

  it('returns null for mainnet USDC when the parent chain is not Ethereum', async () => {
    const result = await getUsdcToken({
      tokenAddress: CommonAddress.Ethereum.USDC,
      parentChainId: ChainId.ArbitrumOne,
      childChainId: ChainId.ApeChain,
    });

    expect(result).toBeNull();
  });
});
