import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProviderForChainId } from '../token-bridge-sdk/utils';
import { ChainId } from '../types/ChainId';
import { ecosystems } from '../wallet/ecosystems';
import { getAccountType } from './AccountUtils';

const { getCode } = vi.hoisted(() => ({ getCode: vi.fn() }));
vi.mock('../token-bridge-sdk/utils', () => ({
  getProviderForChainId: vi.fn(() => ({ getCode })),
}));

describe.sequential('account inspection boundary', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    { chainId: ChainId.Solana, address: 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5' },
    { chainId: ChainId.Ethereum, address: 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5' },
  ])('never constructs an EVM provider for an incompatible account', async (account) => {
    expect(await getAccountType(account)).toBeUndefined();
    expect(getProviderForChainId).not.toHaveBeenCalled();
  });

  it('treats a Solana wallet as an externally owned account', async () => {
    const isEnabled = vi.spyOn(ecosystems.solana, 'isEnabled').mockReturnValue(true);
    try {
      expect(
        await getAccountType({
          chainId: ChainId.Solana,
          address: 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
        }),
      ).toBe('externally-owned-account');
    } finally {
      isEnabled.mockRestore();
    }
    expect(getProviderForChainId).not.toHaveBeenCalled();
  });

  it.each([
    ['0x', 'externally-owned-account'],
    ['0xef01000001', 'delegated-account'],
    ['0x123456', 'smart-contract-wallet'],
  ])('preserves EVM account classification for %s', async (code, expected) => {
    getCode.mockResolvedValue(code);
    const account = {
      chainId: ChainId.Ethereum,
      address: '0x1111111111111111111111111111111111111111',
    };
    expect(await getAccountType(account)).toBe(expected);
    expect(getProviderForChainId).toHaveBeenCalledWith(account.chainId);
    expect(getCode).toHaveBeenCalledWith(account.address);
  });
});
