import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { useBalance } from './useBalance';

const mocks = vi.hoisted(() => ({ getBalanceClient: vi.fn() }));

vi.mock('@wallets', () => ({ getBalanceClient: mocks.getBalanceClient }));

describe('useBalance', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('resolves the client and forwards the balance request', async () => {
    const fetchBalance = vi.fn().mockResolvedValue({});
    mocks.getBalanceClient.mockReturnValue({ ecosystem: 'evm', fetchBalance });
    const { result } = renderHook(() => useBalance({ chainId: ChainId.Ethereum }));

    await result.current.fetchBalance({
      walletAddress: 'wallet-address',
      tokenAddresses: ['token-address'],
    });

    expect(mocks.getBalanceClient).toHaveBeenCalledWith(ChainId.Ethereum);
    expect(fetchBalance).toHaveBeenCalledWith({
      chainId: ChainId.Ethereum,
      walletAddress: 'wallet-address',
      tokenAddresses: ['token-address'],
    });
  });
});
