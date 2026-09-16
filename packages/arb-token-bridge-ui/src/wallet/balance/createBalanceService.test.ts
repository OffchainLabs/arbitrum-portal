import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { createBalanceService } from './createBalanceService';

describe('createBalanceService', () => {
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
