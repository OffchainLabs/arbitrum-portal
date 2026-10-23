import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { getWalletEcosystem } from './getWalletEcosystem';

describe('getWalletEcosystem', () => {
  it('returns the registered ecosystem for supported chains', () => {
    expect(getWalletEcosystem(ChainId.Ethereum)).toBe('evm');
    expect(getWalletEcosystem(ChainId.Solana)).toBe('solana');
  });

  it('rejects an unregistered chain', () => {
    expect(() => getWalletEcosystem(999_999_999)).toThrow('Unexpected chain id');
  });
});
