import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { createBalanceService } from './createBalanceService';

describe('createBalanceService', () => {
  it('deduplicates EVM requests while preserving requested result keys', async () => {
    const account = '0x52908400098527886E0F7030069857D2E4169EE7';
    const token = '0x27B1FDB04752BBC536007A920D24ACB045561C26';
    const fetchBalance = vi.fn().mockResolvedValue({ [token.toLowerCase()]: 7n });
    const service = createBalanceService(() => ({ fetchBalance }));
    expect(
      await service.fetchBalances({
        chainId: 1,
        walletAddress: account,
        tokenAddresses: [token, token.toLowerCase()],
      }),
    ).toEqual({ [token]: 7n, [token.toLowerCase()]: 7n });
    expect(fetchBalance).toHaveBeenCalledExactlyOnceWith({
      chainId: 1,
      walletAddress: account.toLowerCase(),
      tokenAddresses: [token.toLowerCase()],
    });
  });

  it('preserves Solana account and mint casing', async () => {
    const walletAddress = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
    const mint = 'So11111111111111111111111111111111111111112';
    const fetchBalance = vi.fn().mockResolvedValue({ [mint]: 1n });
    const resolve = vi.fn(() => ({ fetchBalance }));
    const service = createBalanceService(resolve);
    const input = { chainId: ChainId.Solana, walletAddress, tokenAddresses: [mint] };
    expect(await service.fetchBalances(input)).toEqual({ [mint]: 1n });
    expect(resolve).toHaveBeenCalledWith(ChainId.Solana);
    expect(fetchBalance).toHaveBeenCalledWith(input);
  });

  it('skips empty requests', async () => {
    const resolve = vi.fn();
    const service = createBalanceService(resolve);
    expect(
      await service.fetchBalances({ chainId: 1, walletAddress: 'account', tokenAddresses: [] }),
    ).toEqual({});
    expect(resolve).not.toHaveBeenCalled();
  });

  it('does not turn missing balances or RPC failures into zero holdings', async () => {
    const fetchBalance = vi.fn().mockResolvedValue({});
    const service = createBalanceService(() => ({ fetchBalance }));
    const input = { chainId: 1, walletAddress: 'account', tokenAddresses: ['token'] };
    expect(await service.fetchBalances(input)).toEqual({});
    fetchBalance.mockRejectedValueOnce(new Error('RPC unavailable'));
    await expect(service.fetchBalances(input)).rejects.toThrow('RPC unavailable');
  });
});
