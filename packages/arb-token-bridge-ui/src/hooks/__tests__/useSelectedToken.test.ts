import { renderHook } from '@testing-library/react';
import { DecodedValueMap } from 'use-query-params';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Context, useAppState } from '../../state';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { ARB_ONE_NATIVE_USDC_TOKEN } from '../../util/l2NativeTokens';
import { ERC20BridgeToken, TokenType } from '../arbTokenBridge.types';
import { queryParamProviderOptions, useArbQueryParams } from '../useArbQueryParams';
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

const canonicalUsdc: ERC20BridgeToken = {
  type: TokenType.ERC20,
  decimals: 6,
  name: 'USD Coin',
  symbol: 'USDC',
  address: CommonAddress.Ethereum.USDC,
  l2Address: CommonAddress.ArbitrumOne['USDC.e'],
  listIds: new Set(['canonical']),
};

vi.mock('../useArbQueryParams', () => ({
  useArbQueryParams: vi.fn(),
}));

vi.mock('../../state', () => ({
  useAppState: vi.fn(),
}));

vi.mock('../../components/TransferPanel/TokenSearchUtils', () => ({
  useTokensFromLists: () => ({ data: {} }),
  useTokensFromUser: () => ({}),
}));

describe('useSelectedToken', () => {
  const mockedUseArbQueryParams = vi.mocked(useArbQueryParams);
  const mockedUseAppState = vi.mocked(useAppState);

  beforeEach(() => {
    mockedUseAppState.mockReturnValue({
      app: {
        arbTokenBridge: {
          bridgeTokens: {
            [canonicalUsdc.address]: canonicalUsdc,
          },
        },
      },
    } as Context['state']);
  });

  it('returns null when no token is set in the query params', () => {
    mockedUseArbQueryParams.mockReturnValue([{ ...defaultQueryParams }, vi.fn()]);

    const { result } = renderHook(useSelectedToken);

    expect(result.current[0]).toBeNull();
  });

  it('uses the canonical token registry mapping for Ethereum USDC', () => {
    mockedUseArbQueryParams.mockReturnValue([
      { ...defaultQueryParams, token: CommonAddress.Ethereum.USDC },
      vi.fn(),
    ]);

    const { result } = renderHook(useSelectedToken);

    expect(result.current[0]).toBe(canonicalUsdc);
    expect(result.current[0]?.l2Address).toBe(CommonAddress.ArbitrumOne['USDC.e']);
  });

  it('uses curated LiFi metadata for Arbitrum native USDC', () => {
    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        sourceChain: ChainId.ArbitrumOne,
        token: CommonAddress.ArbitrumOne.USDC,
      },
      vi.fn(),
    ]);

    const { result } = renderHook(useSelectedToken);

    expect(result.current[0]).toBe(ARB_ONE_NATIVE_USDC_TOKEN);
  });
});
