import { renderHook } from '@testing-library/react';
import { constants } from 'ethers';
import { DecodedValueMap } from 'use-query-params';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { getTokenOverride } from '../../app/api/crosschain-transfers/utils';
import { Context, useAppState } from '../../state';
import { ChainId } from '../../types/ChainId';
import { getWagmiChain } from '../../util/wagmi/getWagmiChain';
import { ERC20BridgeToken, TokenType } from '../arbTokenBridge.types';
import { queryParamProviderOptions, useArbQueryParams } from '../useArbQueryParams';
import { useDestinationToken } from '../useDestinationToken';
import { useNetworks } from '../useNetworks';
import { useSelectedToken } from '../useSelectedToken';

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
};

vi.mock('../useArbQueryParams', () => ({
  useArbQueryParams: vi.fn(),
}));

vi.mock('../useSelectedToken', () => ({
  useSelectedToken: vi.fn(),
}));

vi.mock('../useNetworks', () => ({
  useNetworks: vi.fn(),
}));

vi.mock('../../state', () => ({
  useAppState: vi.fn(),
}));

vi.mock('../../app/api/crosschain-transfers/utils', () => ({
  getTokenOverride: vi.fn(),
}));

describe.sequential('useDestinationToken', () => {
  const mockedUseArbQueryParams = vi.mocked(useArbQueryParams);
  const mockedUseSelectedToken = vi.mocked(useSelectedToken);
  const mockedUseNetworks = vi.mocked(useNetworks);
  const mockedUseAppState = vi.mocked(useAppState);
  const mockedGetTokenOverride = vi.mocked(getTokenOverride);

  const mockSelectedToken: ERC20BridgeToken = {
    type: TokenType.ERC20,
    decimals: 18,
    name: 'Selected Token',
    symbol: 'SEL',
    address: '0xselected',
    listIds: new Set(['1']),
  };

  const mockDestinationToken: ERC20BridgeToken = {
    type: TokenType.ERC20,
    decimals: 6,
    name: 'Destination Token',
    symbol: 'DEST',
    address: '0xdestination',
    listIds: new Set(['1']),
  };

  const mockOverrideDestination: ERC20BridgeToken = {
    type: TokenType.ERC20,
    decimals: 18,
    name: 'Override Token',
    symbol: 'OVR',
    address: '0xoverride',
    listIds: new Set(['1']),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Ethereum),
        sourceChainProvider: getProviderForChainId(ChainId.Ethereum),
        destinationChain: getWagmiChain(ChainId.ArbitrumOne),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumOne),
      },
      vi.fn(),
    ]);

    mockedUseAppState.mockReturnValue({
      app: {
        arbTokenBridge: {
          bridgeTokens: {
            [mockDestinationToken.address]: mockDestinationToken,
          },
        },
      },
    } as Context['state']);

    mockedUseSelectedToken.mockReturnValue([mockSelectedToken, vi.fn()]);

    mockedUseArbQueryParams.mockReturnValue([
      { ...defaultQueryParams, destinationToken: mockSelectedToken.address },
      vi.fn(),
    ]);
  });

  describe('when not a swap transfer', () => {
    it('should return selectedToken when destinationToken equals selectedToken.address', () => {
      mockedUseArbQueryParams.mockReturnValue([
        { ...defaultQueryParams, destinationToken: mockSelectedToken.address },
        vi.fn(),
      ]);

      const { result } = renderHook(useDestinationToken);
      expect(result.current).toEqual(mockSelectedToken);
    });

    it('should return null when selectedToken is null', () => {
      mockedUseSelectedToken.mockReturnValue([null, vi.fn()]);
      mockedUseArbQueryParams.mockReturnValue([
        { ...defaultQueryParams, destinationToken: undefined },
        vi.fn(),
      ]);

      const { result } = renderHook(useDestinationToken);
      expect(result.current).toBeNull();
    });
  });

  describe('when it is a swap transfer', () => {
    describe('and destinationToken is the zero address', () => {
      it('should return override destination token', () => {
        mockedUseArbQueryParams.mockReturnValue([
          { ...defaultQueryParams, destinationToken: constants.AddressZero },
          vi.fn(),
        ]);

        mockedGetTokenOverride.mockReturnValue({
          source: null,
          destination: mockOverrideDestination,
        });

        const { result } = renderHook(useDestinationToken);

        expect(mockedGetTokenOverride).toHaveBeenCalledWith({
          fromToken: constants.AddressZero,
          sourceChainId: ChainId.Ethereum,
          destinationChainId: ChainId.ArbitrumOne,
        });
        expect(result.current).toEqual(mockOverrideDestination);
      });
    });

    describe('and destinationToken is a specific address', () => {
      it('should return token from bridgeTokens when found', () => {
        mockedUseArbQueryParams.mockReturnValue([
          { ...defaultQueryParams, destinationToken: mockDestinationToken.address },
          vi.fn(),
        ]);

        const { result } = renderHook(useDestinationToken);
        expect(result.current).toEqual(mockDestinationToken);
      });

      it('should handle case insensitive address lookup in bridgeTokens', () => {
        mockedUseArbQueryParams.mockReturnValue([
          { ...defaultQueryParams, destinationToken: mockDestinationToken.address.toUpperCase() },
          vi.fn(),
        ]);

        const { result } = renderHook(useDestinationToken);
        expect(result.current).toEqual(mockDestinationToken);
      });

      it('should return null when destinationToken is not found in bridgeTokens', () => {
        mockedUseArbQueryParams.mockReturnValue([
          { ...defaultQueryParams, destinationToken: '0xnotfound' },
          vi.fn(),
        ]);

        const { result } = renderHook(useDestinationToken);
        expect(result.current).toBeNull();
      });
    });

    describe('and destinationToken is null or undefined', () => {
      it('should return null when destinationToken is null', () => {
        mockedUseArbQueryParams.mockReturnValue([
          { ...defaultQueryParams, destinationToken: undefined },
          vi.fn(),
        ]);

        const { result } = renderHook(useDestinationToken);
        expect(result.current).toBeNull();
      });

      it('should return null when destinationToken is undefined', () => {
        mockedUseArbQueryParams.mockReturnValue([
          { ...defaultQueryParams, destinationToken: undefined },
          vi.fn(),
        ]);

        const { result } = renderHook(useDestinationToken);
        expect(result.current).toBeNull();
      });

      it('should return null when destinationToken is an empty string', () => {
        mockedUseArbQueryParams.mockReturnValue([
          { ...defaultQueryParams, destinationToken: '' },
          vi.fn(),
        ]);

        const { result } = renderHook(useDestinationToken);
        expect(result.current).toBeNull();
      });
    });

    it('should handle ApeChain as source chain', () => {
      mockedUseNetworks.mockReturnValue([
        {
          sourceChain: getWagmiChain(ChainId.ApeChain),
          sourceChainProvider: getProviderForChainId(ChainId.ApeChain),
          destinationChain: getWagmiChain(ChainId.ArbitrumOne),
          destinationChainProvider: getProviderForChainId(ChainId.ArbitrumOne),
        },
        vi.fn(),
      ]);

      mockedUseArbQueryParams.mockReturnValue([
        { ...defaultQueryParams, destinationToken: constants.AddressZero },
        vi.fn(),
      ]);

      mockedGetTokenOverride.mockReturnValue({
        source: null,
        destination: mockOverrideDestination,
      });

      const { result } = renderHook(useDestinationToken);

      expect(mockedGetTokenOverride).toHaveBeenCalledWith({
        fromToken: constants.AddressZero,
        sourceChainId: ChainId.ApeChain,
        destinationChainId: ChainId.ArbitrumOne,
      });
      expect(result.current).toEqual(mockOverrideDestination);
    });
  });
});
