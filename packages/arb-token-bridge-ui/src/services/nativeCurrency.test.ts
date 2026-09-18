import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { fetchNativeCurrency } from './nativeCurrency';

const providers = vi.hoisted(() => ({
  getProviderForChainId: vi.fn(() => {
    throw new Error('An EVM provider must not be created');
  }),
}));

vi.mock('../token-bridge-sdk/utils', () => providers);

describe('native currency service', () => {
  it('reads Solana native currency without constructing an EVM provider', async () => {
    expect(await fetchNativeCurrency({ chainId: ChainId.Solana })).toMatchObject({
      symbol: 'SOL',
      decimals: 9,
      isCustom: false,
    });
    expect(providers.getProviderForChainId).not.toHaveBeenCalled();
  });

  it('rejects unsupported chains before requesting an EVM provider', async () => {
    await expect(fetchNativeCurrency({ chainId: 999999999 })).rejects.toThrow();
    expect(providers.getProviderForChainId).not.toHaveBeenCalled();
  });
});
