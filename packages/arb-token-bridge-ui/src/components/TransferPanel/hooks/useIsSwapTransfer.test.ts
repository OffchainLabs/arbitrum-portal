import { renderHook } from '@testing-library/react';
import { constants } from 'ethers';
import { DecodedValueMap } from 'use-query-params';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        destinationToken: CommonAddress.ArbitrumOne.PYUSDOFT,
      },
      vi.fn(),
    ]);

    mockedUseSelectedToken.mockReturnValue([
      getArbitrumOnePyusdOftToken({
        priceUSD: 1,
        listIds: new Set(['1']),
      }),
      vi.fn(),
    ]);
  });

  it('does not treat PYUSD (OFT) to PYUSD (L1) as a swap', () => {
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
});
