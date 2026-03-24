import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { ERC20BridgeToken, TokenType } from '../arbTokenBridge.types';
import { useArbQueryParams } from '../useArbQueryParams';
import { useNetworks } from '../useNetworks';
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

describe('useSelectedToken', () => {
  const mockedUseArbQueryParams = vi.mocked(useArbQueryParams);
  const mockedUseNetworks = vi.mocked(useNetworks);
  const mockedUseNetworksRelationship = vi.mocked(useNetworksRelationship);

  beforeEach(() => {
    tokensFromUserValue = {};
    tokensFromListsValue = {
      [CommonAddress.Ethereum.PYUSD.toLowerCase()]: {
        type: TokenType.ERC20,
        decimals: 6,
        name: 'PYUSD',
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

    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: { id: ChainId.Ethereum },
        destinationChain: { id: ChainId.ArbitrumOne },
      },
      vi.fn(),
    ] as never);

    mockedUseNetworksRelationship.mockReturnValue({
      childChain: { id: ChainId.ArbitrumOne },
      parentChain: { id: ChainId.Ethereum },
      isDepositMode: true,
    } as never);
  });

  it('keeps the same PYUSD token object when unrelated token-list entries change', () => {
    const { result, rerender } = renderHook(() => useSelectedToken());
    const firstSelectedToken = result.current[0];

    tokensFromListsValue = {
      [CommonAddress.Ethereum.PYUSD.toLowerCase()]: {
        type: TokenType.ERC20,
        decimals: 6,
        name: 'PYUSD',
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
});
