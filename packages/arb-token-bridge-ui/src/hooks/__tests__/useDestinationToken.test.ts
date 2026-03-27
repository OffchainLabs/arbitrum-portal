import { renderHook } from '@testing-library/react';
import { constants } from 'ethers';
import { DecodedValueMap } from 'use-query-params';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { getTokenOverride } from '../../app/api/crosschain-transfers/utils';
import { useTokensFromLists } from '../../components/TransferPanel/TokenSearchUtils';
import { Context, useAppState } from '../../state';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import {
  ETHEREUM_PYUSD_LOGO_URI,
  getArbitrumOnePyusdOftToken,
  getEthereumPyusdToken,
} from '../../util/PyusdUtils';
import { getWagmiChain } from '../../util/wagmi/getWagmiChain';
import { ERC20BridgeToken, TokenType } from '../arbTokenBridge.types';
import { queryParamProviderOptions, useArbQueryParams } from '../useArbQueryParams';
import { useDestinationToken } from '../useDestinationToken';
import { UseNetworksState, useNetworks } from '../useNetworks';
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
  debugLevel: 'silent',
  experiments: undefined,
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

vi.mock('../../components/TransferPanel/TokenSearchUtils', () => ({
  useTokensFromLists: vi.fn(),
}));

function makeNetworksState(sourceChainId: ChainId, destinationChainId: ChainId): UseNetworksState {
  return {
    sourceChain: getWagmiChain(sourceChainId),
    sourceChainProvider: getProviderForChainId(sourceChainId),
    destinationChain: getWagmiChain(destinationChainId),
    destinationChainProvider: getProviderForChainId(destinationChainId),
  };
}

describe.sequential('useDestinationToken', () => {
  const mockedUseArbQueryParams = vi.mocked(useArbQueryParams);
  const mockedUseSelectedToken = vi.mocked(useSelectedToken);
  const mockedUseNetworks = vi.mocked(useNetworks);
  const mockedUseAppState = vi.mocked(useAppState);
  const mockedGetTokenOverride = vi.mocked(getTokenOverride);
  const mockedUseTokensFromLists = vi.mocked(useTokensFromLists);

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
    mockedGetTokenOverride.mockReturnValue({
      source: null,
      destination: null,
    });

    mockedUseNetworks.mockReturnValue([
      makeNetworksState(ChainId.Ethereum, ChainId.ArbitrumOne),
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
    mockedUseTokensFromLists.mockReturnValue({});

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

    it('maps Ethereum PYUSD deposits to Arbitrum One PYUSD OFT when both query params are the L1 address', () => {
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
          token: CommonAddress.Ethereum.PYUSD,
          destinationToken: CommonAddress.Ethereum.PYUSD,
        },
        vi.fn(),
      ]);

      mockedGetTokenOverride.mockImplementation(({ fromToken }) =>
        fromToken === CommonAddress.Ethereum.PYUSD
          ? {
              source: getEthereumPyusdToken({
                priceUSD: 1,
                listIds: new Set(['1']),
              }),
              destination: getArbitrumOnePyusdOftToken(),
            }
          : {
              source: null,
              destination: null,
            },
      );

      const { result } = renderHook(useDestinationToken);

      expect(result.current).toMatchObject({
        ...getArbitrumOnePyusdOftToken({
          priceUSD: 1,
          listIds: new Set(['1']),
        }),
        logoURI: ETHEREUM_PYUSD_LOGO_URI,
      });
      expect(result.current?.logoURI).toBe(ETHEREUM_PYUSD_LOGO_URI);
    });

    it('maps PYUSD OFT withdrawals back to Ethereum PYUSD when both query params are the OFT address', () => {
      mockedUseNetworks.mockReturnValue([
        makeNetworksState(ChainId.ArbitrumOne, ChainId.Ethereum),
        vi.fn(),
      ]);

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
          token: CommonAddress.ArbitrumOne.PYUSDOFT,
          destinationToken: CommonAddress.ArbitrumOne.PYUSDOFT,
        },
        vi.fn(),
      ]);
      mockedGetTokenOverride.mockImplementation(({ fromToken }) =>
        fromToken === CommonAddress.ArbitrumOne.PYUSDOFT
          ? {
              source: null,
              destination: getEthereumPyusdToken({
                priceUSD: 1,
                listIds: new Set(['1']),
              }),
            }
          : {
              source: null,
              destination: null,
            },
      );

      const { result } = renderHook(useDestinationToken);

      expect(result.current).toEqual(
        getEthereumPyusdToken({
          priceUSD: 1,
          listIds: new Set(['1']),
        }),
      );
    });

    it('maps PYUSD OFT withdrawals safely before bridgeTokens hydrate when both query params are the OFT address', () => {
      mockedUseNetworks.mockReturnValue([
        makeNetworksState(ChainId.ArbitrumOne, ChainId.Ethereum),
        vi.fn(),
      ]);

      mockedUseAppState.mockReturnValue({
        app: {
          arbTokenBridge: {
            bridgeTokens: undefined,
          },
        },
      } as Context['state']);

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
          token: CommonAddress.ArbitrumOne.PYUSDOFT,
          destinationToken: CommonAddress.ArbitrumOne.PYUSDOFT,
        },
        vi.fn(),
      ]);
      mockedGetTokenOverride.mockImplementation(({ fromToken }) =>
        fromToken === CommonAddress.ArbitrumOne.PYUSDOFT
          ? {
              source: null,
              destination: getEthereumPyusdToken({
                priceUSD: 1,
                listIds: new Set(['1']),
              }),
            }
          : {
              source: null,
              destination: null,
            },
      );

      const { result } = renderHook(useDestinationToken);

      expect(result.current).toEqual(
        getEthereumPyusdToken({
          priceUSD: 1,
          listIds: new Set(['1']),
        }),
      );
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

      it('prefers token-list metadata for explicitly selected destination tokens', () => {
        const tokenListDestinationToken = {
          ...mockDestinationToken,
          logoURI: 'https://example.com/black.png',
        };

        mockedUseArbQueryParams.mockReturnValue([
          { ...defaultQueryParams, destinationToken: mockDestinationToken.address },
          vi.fn(),
        ]);
        mockedUseAppState.mockReturnValue({
          app: {
            arbTokenBridge: {
              bridgeTokens: {
                [mockDestinationToken.address.toLowerCase()]: {
                  ...mockDestinationToken,
                  logoURI: 'https://example.com/blue.png',
                },
              },
            },
          },
        } as Context['state']);
        mockedUseTokensFromLists.mockReturnValue({
          [mockDestinationToken.address.toLowerCase()]: tokenListDestinationToken,
        });

        const { result } = renderHook(useDestinationToken);

        expect(result.current?.logoURI).toBe(tokenListDestinationToken.logoURI);
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
        makeNetworksState(ChainId.ApeChain, ChainId.ArbitrumOne),
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
