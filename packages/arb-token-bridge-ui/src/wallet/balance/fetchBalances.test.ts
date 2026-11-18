import { getAddress } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { fetchBalances } from './fetchBalances';
import { getBalanceClient } from './getBalanceClient';

vi.mock('./getBalanceClient', () => ({ getBalanceClient: vi.fn() }));

describe.sequential('fetchBalances', () => {
  beforeEach(() => vi.mocked(getBalanceClient).mockReset());

  it('deduplicates EVM requests while preserving requested result keys', async () => {
    const account = '0x52908400098527886E0F7030069857D2E4169EE7';
    const token = getAddress('0x27b1fdb04752bbc536007a920d24acb045561c26');
    const fetchBalance = vi.fn().mockResolvedValue({ [token.toLowerCase()]: 7n });
    vi.mocked(getBalanceClient).mockReturnValue({ fetchBalance });
    expect(
      await fetchBalances({
        chainId: 1,
        walletAddress: account,
        tokenAddresses: [token, token.toLowerCase()],
      }),
    ).toEqual({ [token]: 7n, [token.toLowerCase()]: 7n });
    expect(fetchBalance).toHaveBeenCalledExactlyOnceWith({
      chainId: 1,
      walletAddress: account,
      tokenAddresses: [token.toLowerCase()],
    });
  });

  it('preserves Solana account and mint casing', async () => {
    const walletAddress = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
    const mint = 'So11111111111111111111111111111111111111112';
    const fetchBalance = vi.fn().mockResolvedValue({ [mint]: 1n });
    vi.mocked(getBalanceClient).mockReturnValue({ fetchBalance });
    const input = { chainId: ChainId.Solana, walletAddress, tokenAddresses: [mint] };
    expect(await fetchBalances(input)).toEqual({ [mint]: 1n });
    expect(getBalanceClient).toHaveBeenCalledWith(ChainId.Solana);
    expect(fetchBalance).toHaveBeenCalledWith(input);
  });

  it('skips empty requests', async () => {
    vi.mocked(getBalanceClient).mockClear();
    expect(
      await fetchBalances({ chainId: 1, walletAddress: 'account', tokenAddresses: [] }),
    ).toEqual({});
    expect(getBalanceClient).not.toHaveBeenCalled();
  });

  it('does not turn missing balances or RPC failures into zero holdings', async () => {
    const fetchBalance = vi.fn().mockResolvedValue({});
    vi.mocked(getBalanceClient).mockReturnValue({ fetchBalance });
    const input = { chainId: 1, walletAddress: 'account', tokenAddresses: ['token'] };
    expect(await fetchBalances(input)).toEqual({});
    fetchBalance.mockRejectedValueOnce(new Error('RPC unavailable'));
    await expect(fetchBalances(input)).rejects.toThrow('RPC unavailable');
  });
});
