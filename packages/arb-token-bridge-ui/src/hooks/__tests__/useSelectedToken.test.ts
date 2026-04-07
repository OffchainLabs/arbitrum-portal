import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import {
  getArbitrumOnePyusdCanonicalToken,
  getArbitrumOnePyusdOftToken,
} from '../../util/PyusdUtils';
import { getWagmiChain } from '../../util/wagmi/getWagmiChain';
import { ERC20BridgeToken, TokenType } from '../arbTokenBridge.types';
import { useArbQueryParams } from '../useArbQueryParams';
import { UseNetworksState, useNetworks } from '../useNetworks';
import { useNetworksRelationship } from '../useNetworksRelationship';
import { useSelectedToken } from '../useSelectedToken';

let tokensFromListsValue: Record<string, ERC20BridgeToken | undefined> = {};
let tokensFromUserValue: Record<string, ERC20BridgeToken | undefined> = {};

vi.mock('../../components/TransferPanel/TokenSearchUtils', () => ({
  useTokensFromLists: () => tokensFromListsValue,
  useTokensFromUser: () => tokensFromUserValue,
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

vi.mock('swr/immutable', () => ({
  default: () => ({ data: null }),
}));

type UseNetworksRelationshipState = ReturnType<typeof useNetworksRelationship>;

function makeNetworksState(sourceChainId: ChainId, destinationChainId: ChainId): UseNetworksState {
  return {
    sourceChain: getWagmiChain(sourceChainId),
    sourceChainProvider: getProviderForChainId(sourceChainId),
    destinationChain: getWagmiChain(destinationChainId),
    destinationChainProvider: getProviderForChainId(destinationChainId),
  };
}

function makeNetworksRelationshipState(
  sourceChainId: ChainId,
  destinationChainId: ChainId,
  isDepositMode: boolean,
): UseNetworksRelationshipState {
  const sourceChain = getWagmiChain(sourceChainId);
  const sourceChainProvider = getProviderForChainId(sourceChainId);
  const destinationChain = getWagmiChain(destinationChainId);
  const destinationChainProvider = getProviderForChainId(destinationChainId);

  return {
    childChain: isDepositMode ? destinationChain : sourceChain,
    childChainProvider: isDepositMode ? destinationChainProvider : sourceChainProvider,
    parentChain: isDepositMode ? sourceChain : destinationChain,
    parentChainProvider: isDepositMode ? sourceChainProvider : destinationChainProvider,
    isDepositMode,
    isTeleportMode: false,
    isLifi: false,
  };
}

describe('useSelectedToken', () => {
  const mockedUseArbQueryParams = vi.mocked(useArbQueryParams);
  const mockedUseNetworks = vi.mocked(useNetworks);
  const mockedUseNetworksRelationship = vi.mocked(useNetworksRelationship);

  beforeEach(() => {
    tokensFromUserValue = {};
    tokensFromListsValue = {};

    mockedUseArbQueryParams.mockReturnValue([
      {
        sourceChain: ChainId.Ethereum,
        destinationChain: ChainId.ArbitrumOne,
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
      },
      vi.fn(),
    ]);

    mockedUseNetworks.mockReturnValue([
      makeNetworksState(ChainId.Ethereum, ChainId.ArbitrumOne),
      vi.fn(),
    ]);

    mockedUseNetworksRelationship.mockReturnValue(
      makeNetworksRelationshipState(ChainId.Ethereum, ChainId.ArbitrumOne, true),
    );
  });

  it('keeps the same PayPal USD token object when unrelated token-list entries change', () => {
    tokensFromListsValue = {
      [CommonAddress.Ethereum.PYUSD]: {
        type: TokenType.ERC20,
        decimals: 6,
        name: 'PayPal USD',
        symbol: 'PYUSD',
        address: CommonAddress.Ethereum.PYUSD,
        l2Address: CommonAddress.ArbitrumOne.PYUSDOFT,
        priceUSD: 1,
        listIds: new Set(['lifi-token-list']),
      },
    };
    mockedUseArbQueryParams.mockReturnValue([
      {
        sourceChain: ChainId.Ethereum,
        destinationChain: ChainId.ArbitrumOne,
        amount: '',
        amount2: '',
        destinationAddress: undefined,
        token: CommonAddress.Ethereum.PYUSD,
        destinationToken: CommonAddress.Ethereum.PYUSD,
        settingsOpen: false,
        tab: 0,
        disabledFeatures: [],
        theme: {},
        debugLevel: 'silent',
        experiments: undefined,
      },
      vi.fn(),
    ]);

    const { result, rerender } = renderHook(() => useSelectedToken());
    const firstSelectedToken = result.current[0];

    tokensFromListsValue = {
      [CommonAddress.Ethereum.PYUSD]: {
        type: TokenType.ERC20,
        decimals: 6,
        name: 'PayPal USD',
        symbol: 'PYUSD',
        address: CommonAddress.Ethereum.PYUSD,
        l2Address: CommonAddress.ArbitrumOne.PYUSDOFT,
        priceUSD: 1,
        listIds: new Set(['lifi-token-list']),
      },
      '0x000000000000000000000000000000000000dEaD': {
        type: TokenType.ERC20,
        decimals: 18,
        name: 'Unrelated',
        symbol: 'UNR',
        address: '0x000000000000000000000000000000000000dEaD',
        listIds: new Set(['other-list']),
      },
    };

    rerender();

    expect(result.current[0]).toBe(firstSelectedToken);
  });

  it('resolves L1 PayPal USD to Arbitrum One PayPal USD OFT token', () => {
    tokensFromListsValue = {
      [CommonAddress.Ethereum.PYUSD]: {
        type: TokenType.ERC20,
        decimals: 6,
        name: 'PayPal USD',
        symbol: 'PYUSD',
        address: CommonAddress.Ethereum.PYUSD,
        l2Address: CommonAddress.ArbitrumOne.PYUSDOFT,
        priceUSD: 1,
        listIds: new Set(['lifi-token-list']),
      },
    };
    mockedUseArbQueryParams.mockReturnValue([
      {
        sourceChain: ChainId.ArbitrumOne,
        destinationChain: ChainId.Ethereum,
        amount: '',
        amount2: '',
        destinationAddress: undefined,
        token: CommonAddress.Ethereum.PYUSD,
        destinationToken: CommonAddress.Ethereum.PYUSD,
        settingsOpen: false,
        tab: 0,
        disabledFeatures: [],
        theme: {},
        debugLevel: 'silent',
        experiments: undefined,
      },
      vi.fn(),
    ]);
    mockedUseNetworks.mockReturnValue([
      makeNetworksState(ChainId.ArbitrumOne, ChainId.Ethereum),
      vi.fn(),
    ]);
    mockedUseNetworksRelationship.mockReturnValue(
      makeNetworksRelationshipState(ChainId.ArbitrumOne, ChainId.Ethereum, false),
    );

    const { result } = renderHook(() => useSelectedToken());

    expect(result.current[0]).toEqual(
      getArbitrumOnePyusdOftToken({
        priceUSD: 1,
        listIds: new Set(['lifi-token-list']),
      }),
    );
  });

  it('resolves the Arbitrum One canonical PayPal USD token when selected', () => {
    tokensFromListsValue = {
      [CommonAddress.Ethereum.PYUSD]: {
        type: TokenType.ERC20,
        decimals: 6,
        name: 'PayPal USD',
        symbol: 'PYUSD',
        address: CommonAddress.Ethereum.PYUSD,
        l2Address: CommonAddress.ArbitrumOne.PYUSDOFT,
        priceUSD: 1,
        listIds: new Set(['lifi-token-list']),
      },
    };
    mockedUseArbQueryParams.mockReturnValue([
      {
        sourceChain: ChainId.ArbitrumOne,
        destinationChain: ChainId.Ethereum,
        amount: '',
        amount2: '',
        destinationAddress: undefined,
        token: CommonAddress.ArbitrumOne.PYUSDCanonical,
        destinationToken: CommonAddress.ArbitrumOne.PYUSDCanonical,
        settingsOpen: false,
        tab: 0,
        disabledFeatures: [],
        theme: {},
        debugLevel: 'silent',
        experiments: undefined,
      },
      vi.fn(),
    ]);
    mockedUseNetworks.mockReturnValue([
      makeNetworksState(ChainId.ArbitrumOne, ChainId.Ethereum),
      vi.fn(),
    ]);
    mockedUseNetworksRelationship.mockReturnValue(
      makeNetworksRelationshipState(ChainId.ArbitrumOne, ChainId.Ethereum, false),
    );

    const { result } = renderHook(() => useSelectedToken());

    expect(result.current[0]).toEqual(
      getArbitrumOnePyusdCanonicalToken({
        priceUSD: 1,
        listIds: new Set(['lifi-token-list']),
      }),
    );
    expect(result.current[0]?.l2Address).toBe(CommonAddress.ArbitrumOne.PYUSDCanonical);
  });
});
