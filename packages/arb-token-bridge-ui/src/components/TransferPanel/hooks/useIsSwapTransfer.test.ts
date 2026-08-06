import { renderHook } from '@testing-library/react';
import { DecodedValueMap } from 'use-query-params';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ERC20BridgeToken, TokenType } from '../../../hooks/arbTokenBridge.types';
import { queryParamProviderOptions, useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { LIFI_TRANSFER_LIST_ID } from '../../../util/TokenListUtils';
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

  const selectedToken: ERC20BridgeToken = {
    address: '0x0000000000000000000000000000000000000300',
    decimals: 18,
    listIds: new Set([LIFI_TRANSFER_LIST_ID]),
    name: 'Robinhood Stock Token',
    symbol: 'STOCK',
    type: TokenType.ERC20,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseSelectedToken.mockReturnValue([selectedToken, vi.fn()]);
    mockedUseArbQueryParams.mockReturnValue([
      { ...defaultQueryParams, destinationToken: selectedToken.address },
      vi.fn(),
    ]);
  });

  it('returns false when the same regular token is selected on both sides', () => {
    const { result } = renderHook(useIsSwapTransfer);

    expect(result.current).toBe(false);
  });
});
