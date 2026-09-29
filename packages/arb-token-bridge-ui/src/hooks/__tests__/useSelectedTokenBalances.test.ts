import { renderHook } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSelectedTokenBalances } from '../TransferPanel/useSelectedTokenBalances';
import { useBalanceOnDestinationChain } from '../useBalanceOnDestinationChain';
import { useBalanceOnSourceChain } from '../useBalanceOnSourceChain';
import { useSelectedToken } from '../useSelectedToken';

vi.mock('../useBalanceOnDestinationChain', () => ({
  useBalanceOnDestinationChain: vi.fn(),
}));
vi.mock('../useBalanceOnSourceChain', () => ({
  useBalanceOnSourceChain: vi.fn(),
}));
vi.mock('../useSelectedToken', () => ({
  useSelectedToken: vi.fn(),
}));

describe('useSelectedTokenBalances', () => {
  const token = {
    type: 'ERC20',
    decimals: 18,
    name: 'Random',
    symbol: 'RAND',
    address: '0x123',
    l2Address: '0x234',
    listIds: new Set(['1']),
  } as NonNullable<ReturnType<typeof useSelectedToken>[0]>;

  beforeEach(() => {
    vi.mocked(useSelectedToken).mockReturnValue([token, vi.fn()]);
    vi.mocked(useBalanceOnSourceChain).mockReturnValue(BigNumber.from(200_000));
    vi.mocked(useBalanceOnDestinationChain).mockReturnValue(BigNumber.from(400_000));
  });

  it('returns independently selected source and destination balances', () => {
    const { result } = renderHook(useSelectedTokenBalances);

    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(200_000),
      destinationBalance: BigNumber.from(400_000),
    });
    expect(useBalanceOnSourceChain).toHaveBeenCalledWith(token);
    expect(useBalanceOnDestinationChain).toHaveBeenCalledWith(token);
  });

  it('requests native balances when no token is selected', () => {
    vi.mocked(useSelectedToken).mockReturnValue([null, vi.fn()]);
    vi.mocked(useBalanceOnSourceChain).mockReturnValue(BigNumber.from(100_000));
    vi.mocked(useBalanceOnDestinationChain).mockReturnValue(BigNumber.from(300_000));

    const { result } = renderHook(useSelectedTokenBalances);

    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(100_000),
      destinationBalance: BigNumber.from(300_000),
    });
    expect(useBalanceOnSourceChain).toHaveBeenCalledWith(null);
    expect(useBalanceOnDestinationChain).toHaveBeenCalledWith(null);
  });
});
