import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { createBalanceService } from './createBalanceService';

describe('createBalanceService', () => {
  it('shares EVM identity while preserving requested result keys', async () => {
    const account = '0x52908400098527886E0F7030069857D2E4169EE7';
    const token = '0x27B1FDB04752BBC536007A920D24ACB045561C26';
    const fetchBalance = vi.fn().mockResolvedValue({ [token.toLowerCase()]: 7n });
    const service = createBalanceService(() => ({ fetchBalance }));
    const first = service.subscribe({
      chainId: 1,
      walletAddress: account,
      tokenAddresses: [token],
    });
    const second = service.subscribe({
      chainId: 1,
      walletAddress: account.toLowerCase(),
      tokenAddresses: [token.toLowerCase()],
    });
    expect(await service.fetchBalances({ chainId: 1, walletAddress: account })).toEqual({
      [token]: 7n,
      [token.toLowerCase()]: 7n,
    });
    expect(fetchBalance).toHaveBeenLastCalledWith({
      chainId: 1,
      walletAddress: account.toLowerCase(),
      tokenAddresses: [token.toLowerCase()],
    });
    first();
    expect(await service.fetchBalances({ chainId: 1, walletAddress: account })).toEqual({
      [token.toLowerCase()]: 7n,
    });
    second();
    expect(await service.fetchBalances({ chainId: 1, walletAddress: account })).toEqual({});
  });

  it('isolates chains and preserves non-EVM account and mint casing', async () => {
    const fetchBalance = vi.fn().mockResolvedValue({ Mint: 1n });
    const service = createBalanceService(() => ({ fetchBalance }));
    service.subscribe({
      chainId: ChainId.Solana,
      walletAddress: 'Account',
      tokenAddresses: ['Mint'],
    });
    expect(
      await service.fetchBalances({ chainId: ChainId.Solana, walletAddress: 'account' }),
    ).toEqual({});
    expect(await service.fetchBalances({ chainId: 1, walletAddress: 'Account' })).toEqual({});
    expect(fetchBalance).not.toHaveBeenCalled();
    expect(
      await service.fetchBalances({ chainId: ChainId.Solana, walletAddress: 'Account' }),
    ).toEqual({ Mint: 1n });
  });

  it('refreshes every token registered for an account', async () => {
    const fetchBalance = vi.fn().mockResolvedValue({});
    const service = createBalanceService(() => ({ fetchBalance }));
    const account = {
      chainId: ChainId.Ethereum,
      walletAddress: '0x1111111111111111111111111111111111111111',
    };

    service.subscribe({ ...account, tokenAddresses: ['token-a'] });
    service.subscribe({ ...account, tokenAddresses: ['token-b'] });
    await service.fetchBalances(account);

    expect(fetchBalance).toHaveBeenCalledWith({
      ...account,
      tokenAddresses: ['token-a', 'token-b'],
    });
  });

  it('stops fetching tokens after their last subscriber unmounts', async () => {
    const fetchBalance = vi.fn().mockResolvedValue({});
    const service = createBalanceService(() => ({ fetchBalance }));
    const account = {
      chainId: ChainId.Ethereum,
      walletAddress: '0x1111111111111111111111111111111111111111',
    };
    const unsubscribeFirst = service.subscribe({ ...account, tokenAddresses: ['token-a'] });
    const unsubscribeSecond = service.subscribe({
      ...account,
      tokenAddresses: ['token-a', 'token-b'],
    });

    unsubscribeFirst();
    await service.fetchBalances(account);
    expect(fetchBalance).toHaveBeenLastCalledWith({
      ...account,
      tokenAddresses: ['token-a', 'token-b'],
    });

    unsubscribeSecond();
    await service.fetchBalances(account);
    expect(fetchBalance).toHaveBeenCalledTimes(1);
  });
});
